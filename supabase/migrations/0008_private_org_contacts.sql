-- Fix: anyone could read every approved organisation's contact person (name and email) and the
-- storage path of its Child Safe document through the public API, because the "public approved
-- orgs" policy shares whole rows. Row-level security can't hide individual columns, so:
-- 1. The contact person moves to organisation_contacts, readable only by the org's members and admins.
-- 2. The public only learns whether a Child Safe document is on file (has_child_safe), and only the
--    listed organisation columns can be read through the API.

create table organisation_contacts (
  org_id uuid primary key references organisations on delete cascade,
  contact_name text not null,
  contact_email text not null
);
insert into organisation_contacts (org_id, contact_name, contact_email)
  select id, contact_name, contact_email from organisations;

alter table organisation_contacts enable row level security;
create policy "members and admins read org contact" on organisation_contacts for select
  using (is_org_member(org_id) or is_admin());
create policy "members add org contact" on organisation_contacts for insert to authenticated
  with check (is_org_member(org_id));
create policy "members and admins edit org contact" on organisation_contacts for update
  using (is_org_member(org_id) or is_admin()) with check (is_org_member(org_id) or is_admin());

alter table organisations drop column contact_name, drop column contact_email;

alter table organisations add column has_child_safe boolean generated always as (child_safe_doc_path is not null) stored;

-- Column-level read access. Not readable through the API: child_safe_doc_path, created_by.
revoke select on organisations from anon, authenticated;
grant select (id, slug, name, type, abn, about, website, status, approved_at, created_at, logo_path, has_child_safe)
  on organisations to anon, authenticated;
