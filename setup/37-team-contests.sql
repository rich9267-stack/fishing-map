-- 37: teams in contests + group trophy case (step 3 of profile + groups).
-- A group's owner enters the team into a contest/tournament. Each member still joins on their own;
-- only members who have joined the contest count toward the team. Individual boards are untouched.
create table if not exists public.tournament_teams (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  entered_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  primary key (tournament_id, group_id)
);
alter table public.tournament_teams enable row level security;
create policy "see tournament teams" on public.tournament_teams for select using (public.can_see_tournament(tournament_id));

alter table public.groups add column if not exists showcase jsonb not null default '[]'::jsonb;

create or replace function public.enter_team(p_tid uuid, p_gid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare t record; g record; u uuid;
begin
  if not public.is_member() then raise exception 'sign in first'; end if;
  select * into g from public.groups where id = p_gid and deleted_at is null;
  if not found or g.created_by <> auth.uid() then raise exception 'Only the group owner can enter the team.'; end if;
  select * into t from public.tournaments where id = p_tid;
  if not found or t.cancelled_at is not null or t.ends_at < now() then raise exception 'That contest is not open.'; end if;
  if not public.can_see_tournament(p_tid) then raise exception 'You can''t enter that contest.'; end if;
  insert into public.tournament_teams (tournament_id, group_id, entered_by) values (p_tid, p_gid, auth.uid())
    on conflict (tournament_id, group_id) do update set withdrawn_at = null, entered_by = auth.uid();
  for u in select user_id from public.group_members where group_id = p_gid and status = 'joined' loop
    if u <> auth.uid() then
      perform public.enqueue_notification(u, 'contests', '🏁 ' || g.name || ' is in!', 'Your team entered ' || t.title || ' — open it and tap Join so your catches count.',
        '?go=contest&id=' || p_tid, 'te:' || p_tid || ':' || p_gid || ':' || u);
    end if;
  end loop;
end $$;

create or replace function public.withdraw_team(p_tid uuid, p_gid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.tournament_teams set withdrawn_at = now()
    where tournament_id = p_tid and group_id = p_gid and withdrawn_at is null
      and exists (select 1 from public.groups g where g.id = p_gid and g.created_by = auth.uid());
  if not found then raise exception 'Only the group owner can withdraw the team.'; end if;
end $$;

-- Team boards: length/weight = best single catch, fish = total, species = different kinds across the team
create or replace function public.tournament_team_board(p_id uuid)
returns table(group_id uuid, name text, board text, value double precision, joined_n bigint, total_n bigint)
language sql stable security definer set search_path = public as $$
  with teams as (
    select tt.group_id, g.name from public.tournament_teams tt join public.groups g on g.id = tt.group_id
    where tt.tournament_id = p_id and tt.withdrawn_at is null and g.deleted_at is null and public.can_see_tournament(p_id)),
  mem as (
    select t.group_id, gm.user_id, (tm.user_id is not null) as in_t
    from teams t join public.group_members gm on gm.group_id = t.group_id and gm.status = 'joined'
    left join public.tournament_members tm on tm.tournament_id = p_id and tm.user_id = gm.user_id and tm.status = 'joined'
    where not public.is_blocked(gm.user_id)),
  cnt as (select group_id, count(*) filter (where in_t) as j, count(*) as n from mem group by group_id),
  c as (select m.group_id, f.* from mem m join public.tournament_catch_flags(p_id) f on f.user_id = m.user_id where m.in_t and f.ok),
  agg as (
    select group_id, 'length'::text as board, coalesce(max(length_in), 0)::double precision as value from c group by group_id
    union all select group_id, 'weight', coalesce(max(weight_lb) filter (where not coalesce(weight_est, false)), 0)::double precision from c group by group_id
    union all select group_id, 'fish', coalesce(sum(coalesce(how_many, 1)), 0)::double precision from c group by group_id
    union all select group_id, 'species', count(distinct lower(btrim(species))) filter (where species is not null and btrim(species) <> '')::double precision from c group by group_id)
  select t.group_id, t.name, b.board, coalesce(a.value, 0), cnt.j, cnt.n
  from teams t join cnt on cnt.group_id = t.group_id
  cross join (values ('length'), ('weight'), ('fish'), ('species')) as b(board)
  left join agg a on a.group_id = t.group_id and a.board = b.board;
$$;

-- Group trophy case: owner hand-picks up to 8 items, same shape as profile showcase items
create or replace function public.set_group_showcase(p_gid uuid, p_items jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 8 then raise exception 'Up to 8 trophies.'; end if;
  if exists (select 1 from jsonb_array_elements(p_items) e where jsonb_typeof(e) <> 'object' or char_length(coalesce(e->>'title', '')) not between 1 and 60 or char_length(coalesce(e->>'detail', '')) > 120 or char_length(coalesce(e->>'icon', '')) > 8) then
    raise exception 'Each trophy needs a title (up to 60 letters).'; end if;
  update public.groups set showcase = p_items where id = p_gid and created_by = auth.uid() and deleted_at is null;
  if not found then raise exception 'Only the group owner can edit the trophy case.'; end if;
end $$;

revoke all on function public.enter_team(uuid, uuid), public.withdraw_team(uuid, uuid), public.tournament_team_board(uuid), public.set_group_showcase(uuid, jsonb) from public, anon;
grant execute on function public.enter_team(uuid, uuid), public.withdraw_team(uuid, uuid), public.tournament_team_board(uuid), public.set_group_showcase(uuid, jsonb) to authenticated;
