-- Contacts for a role: a point person for questions and the person volunteers meet on the day.
-- Kept out of `opportunities` so the public listing never exposes them. Volunteers only see them
-- after registering interest, and only if the organisation confirmed it has permission to share.

create table opportunity_contacts (
  opportunity_id uuid primary key references opportunities on delete cascade,
  contact_name text,
  contact_email text,
  contact_phone text,
  onsite_same boolean not null default true,
  onsite_name text,
  onsite_phone text,
  share_consent boolean not null default false,
  consent_at timestamptz,
  consent_by uuid references auth.users on delete set null,
  updated_at timestamptz not null default now()
);

-- Record who ticked the permission box, and when.
create function stamp_contact_consent() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.share_consent and (tg_op = 'INSERT' or not old.share_consent) then
    new.consent_at := now(); new.consent_by := auth.uid();
  elsif not new.share_consent then
    new.consent_at := null; new.consent_by := null;
  end if;
  return new;
end $$;
create trigger t_contact_consent before insert or update on opportunity_contacts for each row execute function stamp_contact_consent();

alter table opportunity_contacts enable row level security;

create policy "members manage contacts" on opportunity_contacts for all
  using (is_org_member((select org_id from opportunities where id = opportunity_id)) or is_admin())
  with check (is_org_member((select org_id from opportunities where id = opportunity_id)) or is_admin());

create policy "registered volunteer sees contacts" on opportunity_contacts for select
  using (
    share_consent
    and exists (
      select 1 from interests i
      where i.opportunity_id = opportunity_contacts.opportunity_id
        and i.volunteer_id = auth.uid()
        and i.status in ('interested', 'confirmed')
    )
  );
