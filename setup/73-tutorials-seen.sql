-- 73: 🧭 screen tutorials (Oct 16, v117). Remembers which intro cards each person has already seen, so a card shows ONCE per person, on every phone.
-- One private row per person per card. Only YOU can see or add your own rows (not friends, not the admin through the app).
-- screen_key = one of the 7 tabs (home, map, play, compete, community, stats, settings) or 'photo-tip' (the tip after the first photo).
-- Rows are only ever added: "?" replays a card without touching the table. Deleting an account removes its rows (on delete cascade).
-- Only create / grant (the Supabase connector refuses removals).

create table public.tutorials_seen (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  screen_key text not null check (screen_key in ('home','map','play','compete','community','stats','settings','photo-tip')),
  seen_at timestamptz not null default now(),
  primary key (user_id, screen_key)
);

alter table public.tutorials_seen enable row level security;
create policy "see own tutorials" on public.tutorials_seen for select using (public.is_member() and user_id = auth.uid());
create policy "add own tutorials" on public.tutorials_seen for insert with check (public.is_member() and user_id = auth.uid());
grant select, insert on public.tutorials_seen to authenticated;
