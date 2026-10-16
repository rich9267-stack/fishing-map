-- 70: 🎨 free color palettes (Oct 15, v112). Each person's chosen palette follows them to every device.
-- One private row per person. Only YOU can see or change your own row (not friends, not the admin through the app).
-- palette = one of the 16 free palette keys, or 'original' (the app's own colors). Paid style packs are NOT here yet.
-- Only create / grant (the Supabase connector refuses removals).

create table public.app_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  palette text not null default 'original' check (palette in ('original',
    'deepsea','bluefin','seagrass','mangrove','basslake','mahi','sunrise','redfish',
    'snapper','reef','dusk','sandbar','tarpon','storm','nightbite','midnight')),
  updated_at timestamptz not null default now()
);

alter table public.app_prefs enable row level security;
create policy "see own prefs" on public.app_prefs for select using (public.is_member() and user_id = auth.uid());
create policy "add own prefs" on public.app_prefs for insert with check (public.is_member() and user_id = auth.uid());
create policy "change own prefs" on public.app_prefs for update using (public.is_member() and user_id = auth.uid()) with check (public.is_member() and user_id = auth.uid());
grant select, insert, update on public.app_prefs to authenticated;
