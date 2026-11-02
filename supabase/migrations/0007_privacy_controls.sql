-- Privacy controls (see docs/PRIVACY-AND-SECURITY.md).
-- 1. Calendar feeds no longer carry anyone's contact details: feed links get forwarded and synced
--    to third-party calendar services. Contacts stay on signed-in pages and per-event downloads.
-- 2. People can reset a calendar link that may have been shared.
-- 3. Volunteers can delete their own account (APP 11.2: don't keep what's no longer needed).
-- 4. Reminder logs are deleted after 90 days.

create or replace function calendar_feed_events(p_token text)
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
      null::text, null::text, 'volunteer'
    from interests i
    join opportunities o on o.id = i.opportunity_id
    join organisations org on org.id = o.org_id
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

-- Replaces the caller's calendar link. The old link stops working straight away.
create function reset_my_calendar_token(p_org uuid default null) returns text
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  delete from calendar_feeds where user_id = auth.uid() and org_id is not distinct from p_org;
  return my_calendar_token(p_org);
end $$;

-- Deletes the caller's account and everything tied to it (profile, interests, reminder settings,
-- calendar links, reminder logs) through the existing on-delete-cascade rules.
-- Organisation members are stopped first so a group isn't left without anyone to run it.
create function delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if exists (select 1 from org_members where user_id = auth.uid()) then
    raise exception 'You look after a group on Pi-Volunteers. Contact us to hand it over or close it before deleting your account.';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

grant execute on function reset_my_calendar_token(uuid), delete_my_account() to authenticated;
revoke execute on function reset_my_calendar_token(uuid), delete_my_account() from anon;

-- Daily at 3:30am UTC (early afternoon in Melbourne, a quiet time).
select cron.schedule(
  'pi-volunteers-retention',
  '30 3 * * *',
  $$ delete from public.reminder_log where created_at < now() - interval '90 days' $$
);
