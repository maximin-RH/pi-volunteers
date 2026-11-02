-- protect_org_status() blocked every status change without an app admin login, including
-- Supabase Studio (connected as postgres), which is how the README says to approve organisations.
-- Requests from the website run as anon or authenticated, so only those still need is_admin().

create or replace function protect_org_status() returns trigger language plpgsql as $$
declare
  trusted boolean := current_user not in ('anon', 'authenticated') or is_admin();
begin
  if tg_op = 'INSERT' and not trusted then
    new.status := 'pending'; new.approved_at := null;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status and not trusted then
    raise exception 'Only an admin can change organisation status';
  end if;
  if new.status = 'approved' and new.approved_at is null then new.approved_at := now(); end if;
  return new;
end $$;
