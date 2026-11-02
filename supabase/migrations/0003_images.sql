-- Organisation logos (required at registration) and event photos.
-- A role shows its own photo if it has one, otherwise the organisation's logo.

alter table organisations add column logo_path text;

-- Append org_logo to the public listing (existing columns unchanged, so replace is safe).
create or replace view opportunity_listing with (security_invoker = false) as
  select o.*, org.name as org_name, org.slug as org_slug,
    org.child_safe_doc_path is not null as org_child_safe,
    (select count(*) from interests i where i.opportunity_id = o.id and i.status = 'confirmed')::int as confirmed_count,
    org.logo_path as org_logo
  from opportunities o join organisations org on org.id = o.org_id
  where o.status = 'live' and org.status = 'approved';

-- Images only, 5 MB max. No SVG: it can carry scripts.
insert into storage.buckets (id, name, public) values ('org-logos', 'org-logos', true) on conflict do nothing;
update storage.buckets
  set file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
  where id in ('org-logos', 'role-images');

-- Logos are uploaded before the organisation exists, so they go in the uploader's own folder.
create policy "upload own org logo" on storage.objects for insert to authenticated
  with check (bucket_id = 'org-logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "read org logos" on storage.objects for select using (bucket_id = 'org-logos');

-- Role photos go in the organisation's folder, and only its members can upload there.
drop policy "upload role images" on storage.objects;
create policy "members upload role images" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'role-images'
    and (storage.foldername(name))[1] in (select org_id::text from org_members where user_id = auth.uid())
  );
