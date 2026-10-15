-- 66: security hardening before sharing the app with people Richard doesn't know.
--  A) Fish ID daily cap per member (stops one account from using up the free Gemini quota for everyone).
--  B) Pin the search path on 8 helper functions (Supabase security advisor "function_search_path_mutable").
-- Safe to run twice.

-- A) one row per member per New York day; only fish_id_take() touches it (RLS on, no policies)
create table if not exists public.fish_id_usage (
  user_id uuid not null,
  day date not null,
  n integer not null default 0,
  primary key (user_id, day)
);
alter table public.fish_id_usage enable row level security;

-- Returns true and counts one use if this signed-in member is under 30 Fish IDs today; false otherwise.
create or replace function public.fish_id_take()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  u uuid := auth.uid();
  d date := (now() at time zone 'America/New_York')::date;
  used integer;
begin
  if u is null or not public.is_member() then return false; end if;
  insert into public.fish_id_usage (user_id, day, n) values (u, d, 1)
  on conflict (user_id, day) do update set n = public.fish_id_usage.n + 1
    where public.fish_id_usage.n < 30
  returning n into used;
  return used is not null;
end
$$;
grant execute on function public.fish_id_take() to authenticated;

-- B) pin the search path (public first, then the extensions schema) on helper functions that had none
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
      and p.proname in ('_race_label', 'guard_review_state', 'hav_mi', 'make_handle', 'photos_no_gps', 'race_class', 'race_time', 'spots_sync_visibility')
      and p.prokind = 'f'
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
  loop
    execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
  end loop;
end
$$;
