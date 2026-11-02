-- Calendars and reminders.
-- 1. Organisations choose when confirmed volunteers are reminded, and by email and/or text.
-- 2. Volunteers can turn either channel off, and give a mobile for texts.
-- 3. A scheduled job (see README) calls the app, which claims due reminders through a
--    security definer function guarded by a shared secret, and sends them.
-- 4. Private calendar subscription links for volunteers and organisations.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- What the organisation chose for each role. Hours before the volunteer slot starts.
alter table opportunities
  add column reminder_hours int[] not null default '{24}'
    check (reminder_hours <@ array[168, 48, 24, 2]),
  add column reminder_channels text[] not null default '{email}'
    check (reminder_channels <@ array['email', 'sms']);

-- Volunteer preferences. Only the volunteer can read these (existing profile RLS).
alter table profiles
  add column reminder_email boolean not null default true,
  add column reminder_sms boolean not null default false,
  add column reminder_phone text;

-- One row per reminder sent (or skipped/failed), so nothing is ever sent twice.
create table reminder_log (
  id bigint generated always as identity primary key,
  interest_id uuid not null references interests on delete cascade,
  hours_before int not null,
  channel text not null check (channel in ('email', 'sms')),
  status text not null default 'sending' check (status in ('sending', 'sent', 'skipped', 'failed')),
  detail text,
  created_at timestamptz not null default now(),
  unique (interest_id, hours_before, channel)
);
alter table reminder_log enable row level security; -- no policies: not readable through the API

-- Server-side secrets, set per environment with SQL (see README). Never readable through the API.
create table app_secrets (name text primary key, value text not null);
alter table app_secrets enable row level security;
revoke all on app_secrets from anon, authenticated;

create function check_cron_secret(p_secret text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or p_secret is distinct from (select value from app_secrets where name = 'cron_secret') then
    raise exception 'Not allowed';
  end if;
end $$;
revoke all on function check_cron_secret(text) from public, anon, authenticated;

-- Claims reminders that are due now and returns what's needed to send them.
-- Only the latest reminder point that has passed is sent, so a volunteer confirmed the day
-- before doesn't also get the "1 week to go" reminder.
create function claim_due_reminders(p_secret text)
returns table (
  log_id bigint, channel text, hours_before int, email text, phone text, display_name text,
  opportunity_id uuid, title text, org_name text, starts_at timestamptz, ends_at timestamptz,
  venue text, suburb text, onsite_name text, onsite_phone text
)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  perform check_cron_secret(p_secret);
  return query
  with due as (
    select distinct on (i.id) i.id as interest_id, i.volunteer_id, h as hours_before, o.reminder_channels
    from interests i
    join opportunities o on o.id = i.opportunity_id
    join organisations org on org.id = o.org_id and org.status = 'approved'
    cross join unnest(o.reminder_hours) as h
    where i.status = 'confirmed' and o.status = 'live' and o.kind = 'slot'
      and o.starts_at > now()
      and o.starts_at - make_interval(hours => h) <= now()
    order by i.id, h asc
  ),
  wanted as (
    select d.interest_id, d.hours_before, c.ch as channel
    from due d
    join profiles p on p.id = d.volunteer_id
    join auth.users u on u.id = d.volunteer_id
    cross join unnest(d.reminder_channels) as c(ch)
    where (c.ch = 'email' and p.reminder_email and u.email is not null)
       or (c.ch = 'sms' and p.reminder_sms and p.reminder_phone is not null)
  ),
  claimed as (
    insert into reminder_log (interest_id, hours_before, channel)
    select interest_id, hours_before, channel from wanted
    on conflict do nothing
    returning id, interest_id, hours_before, channel
  )
  select cl.id, cl.channel, cl.hours_before, u.email::text, p.reminder_phone, i.display_name,
    o.id, o.title, org.name, o.starts_at, o.ends_at, o.venue, o.suburb,
    case when c.share_consent then case when c.onsite_same then c.contact_name else c.onsite_name end end,
    case when c.share_consent then case when c.onsite_same then c.contact_phone else c.onsite_phone end end
  from claimed cl
  join interests i on i.id = cl.interest_id
  join opportunities o on o.id = i.opportunity_id
  join organisations org on org.id = o.org_id
  join auth.users u on u.id = i.volunteer_id
  join profiles p on p.id = i.volunteer_id
  left join opportunity_contacts c on c.opportunity_id = o.id;
end $$;

create function finish_reminder(p_secret text, p_id bigint, p_status text, p_detail text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform check_cron_secret(p_secret);
  update reminder_log set status = p_status, detail = p_detail where id = p_id;
end $$;

-- Private calendar subscription links. org_id null = a volunteer's own commitments.
create table calendar_feeds (
  token text primary key default encode(gen_random_bytes(18), 'hex'),
  user_id uuid not null references auth.users on delete cascade,
  org_id uuid references organisations on delete cascade,
  created_at timestamptz not null default now(),
  unique nulls not distinct (user_id, org_id)
);
alter table calendar_feeds enable row level security;
create policy "own feeds" on calendar_feeds for select using (user_id = auth.uid());

-- Returns the signed-in user's feed token, creating it on first use.
create function my_calendar_token(p_org uuid default null) returns text
language plpgsql security definer set search_path = public as $$
declare t text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if p_org is not null and not is_org_member(p_org) then raise exception 'Not allowed'; end if;
  insert into calendar_feeds (user_id, org_id) values (auth.uid(), p_org) on conflict do nothing;
  select token into t from calendar_feeds where user_id = auth.uid() and org_id is not distinct from p_org;
  return t;
end $$;

-- Events for a feed token. Calendar apps fetch this without signing in, so the token is the key.
-- Volunteer feeds: their upcoming and recent commitments. Org feeds: the org's live volunteer slots
-- with counts only (no volunteer names, since feed links can be forwarded).
create function calendar_feed_events(p_token text)
returns table (
  id uuid, title text, org_name text, starts_at timestamptz, ends_at timestamptz, venue text, suburb text,
  description text, tentative boolean, people_needed int, confirmed_count int, onsite_name text, onsite_phone text,
  feed_kind text
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare f calendar_feeds%rowtype;
begin
  select * into f from calendar_feeds where token = p_token;
  if not found then return; end if;

  if f.org_id is null then
    return query
    select o.id, o.title, org.name, o.starts_at, o.ends_at, o.venue, o.suburb, o.description,
      i.status = 'interested', o.people_needed,
      (select count(*) from interests x where x.opportunity_id = o.id and x.status = 'confirmed')::int,
      case when c.share_consent then case when c.onsite_same then c.contact_name else c.onsite_name end end,
      case when c.share_consent then case when c.onsite_same then c.contact_phone else c.onsite_phone end end,
      'volunteer'
    from interests i
    join opportunities o on o.id = i.opportunity_id
    join organisations org on org.id = o.org_id
    left join opportunity_contacts c on c.opportunity_id = o.id
    where i.volunteer_id = f.user_id and i.status in ('interested', 'confirmed')
      and o.kind = 'slot' and o.starts_at > now() - interval '60 days';
  elsif exists (select 1 from org_members m where m.org_id = f.org_id and m.user_id = f.user_id) then
    return query
    select o.id, o.title, org.name, o.starts_at, o.ends_at, o.venue, o.suburb, o.description,
      false, o.people_needed,
      (select count(*) from interests x where x.opportunity_id = o.id and x.status = 'confirmed')::int,
      null::text, null::text, 'org'
    from opportunities o
    join organisations org on org.id = o.org_id
    where o.org_id = f.org_id and o.status = 'live' and o.kind = 'slot'
      and o.starts_at > now() - interval '60 days';
  end if;
end $$;

grant execute on function claim_due_reminders(text), finish_reminder(text, bigint, text, text),
  my_calendar_token(uuid), calendar_feed_events(text) to anon, authenticated;
