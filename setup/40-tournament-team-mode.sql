-- 40: per-contest team setting. tournaments.team_mode / tournament_series.team_mode = 'singles' (default) | 'both' (teams allowed,
-- separate boards) | 'teams' (teams only: the page shows just the team boards).
-- set_team_mode(id, mode): creator/admin; can't go back to 'singles' while teams are entered; also updates the series.
-- set_latest_series_team_mode(mode): used right after creating a repeating contest whose first round isn't open yet.
-- Trigger tournaments_inherit_team_mode: each new round copies its series' setting.
-- enter_team now refuses 'singles' contests. Existing contests that already had a team became 'both'.
-- (Full SQL = migration `tournament_team_mode`; tested in a rolled-back block: default singles, singles blocks teams,
--  both allows, can't revert with teams in, bogus rejected, series round inherits.)
alter table public.tournaments add column if not exists team_mode text not null default 'singles' check (team_mode in ('singles','both','teams'));
alter table public.tournament_series add column if not exists team_mode text not null default 'singles' check (team_mode in ('singles','both','teams'));
update public.tournaments set team_mode = 'both' where id in (select tournament_id from public.tournament_teams);
create or replace function public.tournament_inherit_team_mode() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.series_id is not null then
    select s.team_mode into new.team_mode from public.tournament_series s where s.id = new.series_id;
    new.team_mode := coalesce(new.team_mode, 'singles');
  end if;
  return new;
end $$;
create trigger tournaments_inherit_team_mode before insert on public.tournaments for each row execute function public.tournament_inherit_team_mode();
create or replace function public.set_team_mode(p_id uuid, p_mode text) returns void
language plpgsql security definer set search_path = public as $$
declare t record;
begin
  if p_mode not in ('singles','both','teams') then raise exception 'pick individuals, teams allowed, or teams only'; end if;
  select * into t from public.tournaments where id = p_id;
  if not found or (t.created_by <> auth.uid() and not public.is_admin()) then raise exception 'Only the creator can change this.'; end if;
  if p_mode = 'singles' and exists (select 1 from public.tournament_teams where tournament_id = p_id and withdrawn_at is null) then
    raise exception 'Teams are already in — withdraw them first.'; end if;
  update public.tournaments set team_mode = p_mode where id = p_id;
  if t.series_id is not null then update public.tournament_series set team_mode = p_mode where id = t.series_id; end if;
end $$;
create or replace function public.set_latest_series_team_mode(p_mode text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_mode not in ('singles','both','teams') then raise exception 'bad mode'; end if;
  update public.tournament_series set team_mode = p_mode
   where id = (select id from public.tournament_series where created_by = auth.uid() order by created_at desc limit 1);
end $$;
-- enter_team: same as setup/37 plus   if t.team_mode = 'singles' then raise exception 'This contest is for individuals only.'; end if;
revoke all on function public.set_team_mode(uuid, text), public.set_latest_series_team_mode(text), public.tournament_inherit_team_mode() from public, anon;
grant execute on function public.set_team_mode(uuid, text), public.set_latest_series_team_mode(text) to authenticated;
