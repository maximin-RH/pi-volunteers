-- Optional attendance tick-off by the organisation once a volunteer slot has started.
-- Recorded only for now: not shown on the site. Groundwork for accolades and an incentive
-- programme later (see docs/ROADMAP.md). null = not recorded.

alter table interests
  add column attended boolean,
  add column attendance_marked_at timestamptz,
  add column attendance_marked_by uuid references auth.users on delete set null;

-- Same rules as before (volunteers can only withdraw; orgs can only confirm or decline), plus:
-- only the organisation records attendance, only for confirmed volunteers, only once the slot has started.
create or replace function guard_interest_update() returns trigger language plpgsql as $$
declare
  opp opportunities%rowtype;
  trusted boolean := current_user not in ('anon', 'authenticated') or is_admin();
begin
  select * into opp from opportunities where id = old.opportunity_id;

  if new.attended is distinct from old.attended then
    if not (trusted or is_org_member(opp.org_id)) then
      raise exception 'Only the organisation can record attendance';
    end if;
    if new.status <> 'confirmed' then
      raise exception 'Attendance can only be recorded for confirmed volunteers';
    end if;
    if opp.kind <> 'slot' or opp.starts_at > now() then
      raise exception 'Attendance can be recorded once the volunteer slot has started';
    end if;
    new.attendance_marked_at := case when new.attended is null then null else now() end;
    new.attendance_marked_by := case when new.attended is null then null else auth.uid() end;
  else
    new.attendance_marked_at := old.attendance_marked_at;
    new.attendance_marked_by := old.attendance_marked_by;
  end if;

  -- No longer confirmed, so any attendance record no longer applies.
  if new.status <> 'confirmed' then
    new.attended := null; new.attendance_marked_at := null; new.attendance_marked_by := null;
  end if;

  if trusted then return new; end if;
  if new.volunteer_id = auth.uid() then
    if new.status not in ('interested', 'withdrawn') then raise exception 'Volunteers can only withdraw'; end if;
  elsif not is_org_member(opp.org_id) then
    raise exception 'Not allowed';
  elsif new.status not in ('confirmed', 'declined') then
    raise exception 'Organisations can only confirm or decline';
  end if;
  new.opportunity_id := old.opportunity_id; new.volunteer_id := old.volunteer_id;
  return new;
end $$;
