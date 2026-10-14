-- 55: ★ "Want to try" and ✕ "Not interested" on suggested spots follow you to every device (Oct 14, v93).
-- One private row per person per suggestion: status = 'want' (on my want-to-try list), 'hidden' (not interested) or
-- 'none' (was on the want-to-try list and I took it off — rows are never removed, the Supabase connector refuses removals).
-- Only YOU can see or change your own rows; nobody else (not friends, not the admin through the app) can read them.
-- Only create / alter-add / create-or-replace / grant.

create table public.suggestion_picks (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  key text not null check (char_length(key) between 1 and 80),          -- the suggestion's OpenStreetMap id, e.g. node/123
  status text not null check (status in ('want', 'hidden', 'none')),
  name text check (char_length(name) <= 120),                           -- the details below are kept for want-to-try rows,
  kind text check (char_length(kind) <= 20),                            -- so the list can be shown without re-loading the map data
  label text check (char_length(label) <= 60),
  trust text check (trust in ('public', 'likely', 'unclear')),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.suggestion_picks enable row level security;
create policy "see own picks" on public.suggestion_picks for select using (public.is_member() and user_id = auth.uid());
create policy "add own picks" on public.suggestion_picks for insert with check (public.is_member() and user_id = auth.uid());
create policy "change own picks" on public.suggestion_picks for update using (public.is_member() and user_id = auth.uid()) with check (public.is_member() and user_id = auth.uid());
grant select, insert, update on public.suggestion_picks to authenticated;

-- A person can keep at most 700 picks (the app itself keeps ≤ 500 hidden + 50 wanted).
create function public.suggestion_picks_cap() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.suggestion_picks where user_id = new.user_id) >= 700 then
    raise exception 'Too many saved suggestions.';
  end if;
  return new;
end $$;
create trigger suggestion_picks_cap before insert on public.suggestion_picks for each row execute function public.suggestion_picks_cap();
