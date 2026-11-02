-- Pi-Volunteers core schema. Launch scope: volunteers 18+ only.
-- Under-18 / guardian consent is phase 2 (see docs/ROADMAP.md); min_age is kept on opportunities so it can be added later.

create extension if not exists "pgcrypto";

create type org_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type org_type as enum ('incorporated_association', 'registered_charity', 'club', 'school_or_council', 'informal_group');
create type member_role as enum ('owner', 'editor');
create type opp_kind as enum ('slot', 'ongoing');
create type opp_status as enum ('draft', 'live', 'closed');
create type interest_status as enum ('interested', 'confirmed', 'declined', 'withdrawn');

create table categories (
  slug text primary key,
  label text not null,
  sort int not null default 0
);

create table suburbs (
  name text primary key
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  suburb text references suburbs(name),
  adult_confirmed boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table organisations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  type org_type not null,
  abn text,
  about text,
  website text,
  contact_name text not null,
  contact_email text not null,
  status org_status not null default 'pending',
  child_safe_doc_path text,
  created_by uuid references auth.users on delete set null default auth.uid(),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table org_members (
  org_id uuid references organisations on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role member_role not null default 'editor',
  primary key (org_id, user_id)
);

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  category text not null references categories(slug),
  kind opp_kind not null default 'slot',
  starts_at timestamptz,
  ends_at timestamptz,
  people_needed int not null default 1 check (people_needed > 0),
  venue text,
  suburb text references suburbs(name),
  description text,
  provides text,
  requirements text[] not null default '{}',
  min_age int not null default 18,
  status opp_status not null default 'draft',
  image_path text,
  cloned_from uuid references opportunities on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind = 'ongoing' or (starts_at is not null and ends_at is not null and ends_at > starts_at))
);
create index on opportunities (status, starts_at);
create index on opportunities (org_id);

-- Contact details are copied in only when the volunteer ticks "share".
create table interests (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities on delete cascade,
  volunteer_id uuid not null references auth.users on delete cascade,
  status interest_status not null default 'interested',
  display_name text not null,
  shared_email text,
  shared_phone text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, volunteer_id)
);
create index on interests (volunteer_id);

-- Helpers -------------------------------------------------------------------

create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false)
$$;

create function is_org_member(o uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from org_members where org_id = o and user_id = auth.uid())
$$;

create function org_is_approved(o uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from organisations where id = o and status = 'approved')
$$;

create function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger t_opp_touch before update on opportunities for each row execute function touch_updated_at();
create trigger t_int_touch before update on interests for each row execute function touch_updated_at();

-- New auth user → profile row.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Creator of an organisation becomes its owner.
create function handle_new_org() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is not null then
    insert into org_members (org_id, user_id, role) values (new.id, new.created_by, 'owner') on conflict do nothing;
  end if;
  return new;
end $$;
create trigger on_org_created after insert on organisations for each row execute function handle_new_org();

-- Only admins can change approval status.
create function protect_org_status() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' and not is_admin() then
    new.status := 'pending'; new.approved_at := null;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status and not is_admin() then
    raise exception 'Only an admin can change organisation status';
  end if;
  if new.status = 'approved' and new.approved_at is null then new.approved_at := now(); end if;
  return new;
end $$;
create trigger t_org_status before insert or update on organisations for each row execute function protect_org_status();

-- Volunteers can only withdraw; orgs can only confirm/decline.
create function guard_interest_update() returns trigger language plpgsql as $$
begin
  if is_admin() then return new; end if;
  if new.volunteer_id = auth.uid() then
    if new.status not in ('interested', 'withdrawn') then raise exception 'Volunteers can only withdraw'; end if;
  elsif not is_org_member((select org_id from opportunities where id = new.opportunity_id)) then
    raise exception 'Not allowed';
  elsif new.status not in ('confirmed', 'declined') then
    raise exception 'Organisations can only confirm or decline';
  end if;
  new.opportunity_id := old.opportunity_id; new.volunteer_id := old.volunteer_id;
  return new;
end $$;
create trigger t_int_guard before update on interests for each row execute function guard_interest_update();

-- Public listing with confirmed counts (no personal data).
create view opportunity_listing with (security_invoker = false) as
  select o.*, org.name as org_name, org.slug as org_slug,
    org.child_safe_doc_path is not null as org_child_safe,
    (select count(*) from interests i where i.opportunity_id = o.id and i.status = 'confirmed')::int as confirmed_count
  from opportunities o join organisations org on org.id = o.org_id
  where o.status = 'live' and org.status = 'approved';

-- RLS -------------------------------------------------------------------------

alter table categories enable row level security;
alter table suburbs enable row level security;
alter table profiles enable row level security;
alter table organisations enable row level security;
alter table org_members enable row level security;
alter table opportunities enable row level security;
alter table interests enable row level security;

create policy "read categories" on categories for select using (true);
create policy "read suburbs" on suburbs for select using (true);

create policy "own profile read" on profiles for select using (id = auth.uid() or is_admin());
create policy "own profile update" on profiles for update using (id = auth.uid())
  with check (id = auth.uid() and is_admin = is_admin());

create policy "public approved orgs" on organisations for select using (status = 'approved' or is_org_member(id) or is_admin());
create policy "register org" on organisations for insert to authenticated with check (created_by = auth.uid());
create policy "members edit org" on organisations for update using (is_org_member(id) or is_admin());

create policy "members see members" on org_members for select using (user_id = auth.uid() or is_org_member(org_id) or is_admin());
create policy "admin manages members" on org_members for all using (is_admin()) with check (is_admin());

create policy "public live opps" on opportunities for select
  using ((status = 'live' and org_is_approved(org_id)) or is_org_member(org_id) or is_admin());
create policy "members create opps" on opportunities for insert to authenticated
  with check (is_org_member(org_id) and (status <> 'live' or org_is_approved(org_id)));
create policy "members edit opps" on opportunities for update
  using (is_org_member(org_id) or is_admin())
  with check (status <> 'live' or org_is_approved(org_id));
create policy "members delete drafts" on opportunities for delete using (is_org_member(org_id) and status = 'draft');

create policy "volunteer sees own interests" on interests for select using (volunteer_id = auth.uid());
create policy "org sees interests" on interests for select
  using (is_org_member((select org_id from opportunities where id = opportunity_id)) or is_admin());
create policy "adult volunteer registers interest" on interests for insert to authenticated
  with check (
    volunteer_id = auth.uid()
    and status = 'interested'
    and (select adult_confirmed from profiles where id = auth.uid())
    and exists (select 1 from opportunities o where o.id = opportunity_id and o.status = 'live' and org_is_approved(o.org_id))
  );
create policy "update interests" on interests for update
  using (volunteer_id = auth.uid() or is_org_member((select org_id from opportunities where id = opportunity_id)) or is_admin());

grant select on opportunity_listing to anon, authenticated;

-- Storage: private bucket for Child Safe evidence, public bucket for role photos.
insert into storage.buckets (id, name, public) values ('child-safe', 'child-safe', false) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('role-images', 'role-images', true) on conflict do nothing;

create policy "upload child safe doc" on storage.objects for insert to authenticated
  with check (bucket_id = 'child-safe' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "read own child safe doc" on storage.objects for select to authenticated
  using (bucket_id = 'child-safe' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));
create policy "upload role images" on storage.objects for insert to authenticated
  with check (bucket_id = 'role-images');
create policy "read role images" on storage.objects for select using (bucket_id = 'role-images');
