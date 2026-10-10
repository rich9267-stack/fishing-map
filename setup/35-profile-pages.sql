-- 35: proper profile pages. A separate table (profile_extras) so the privacy setting is enforced by the database,
-- not just hidden in the app: visibility public | friends | private; a profile picture (private bucket "avatars");
-- accent colour, tagline, favourite species; a pinned catch; a hand-picked showcase (max 8 items).
create table if not exists public.profile_extras (
  user_id uuid primary key references auth.users(id) on delete cascade,
  visibility text not null default 'public' check (visibility in ('public', 'friends', 'private')),
  avatar_path text,
  accent text check (accent is null or accent ~ '^#[0-9a-fA-F]{6}$'),
  tagline text check (tagline is null or char_length(tagline) <= 80),
  fav_species text check (fav_species is null or char_length(fav_species) <= 60),
  pinned_catch_id uuid references public.catches(id) on delete set null,
  showcase jsonb not null default '[]'::jsonb check (jsonb_typeof(showcase) = 'array' and jsonb_array_length(showcase) <= 8),
  updated_at timestamptz not null default now()
);
alter table public.profile_extras enable row level security;

-- Can the signed-in member open this person's profile page? (no row yet = public, like profiles were before)
create or replace function public.can_view_profile(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_member() and not coalesce(public.is_blocked(u), false) and (
    u = auth.uid()
    or coalesce((select visibility from public.profile_extras where user_id = u), 'public') = 'public'
    or (coalesce((select visibility from public.profile_extras where user_id = u), 'public') = 'friends' and public.is_friend(u)));
$$;

-- What the app needs to decide "show the page" vs "blurred + friend request"
create or replace function public.profile_access(u uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'visibility', coalesce((select visibility from public.profile_extras where user_id = u), 'public'),
    'can_view', public.can_view_profile(u),
    'is_self', u = auth.uid());
$$;

create policy "see allowed profile pages" on public.profile_extras for select using (public.can_view_profile(user_id));
create policy "add own profile page" on public.profile_extras for insert with check (user_id = auth.uid() and public.is_member());
create policy "edit own profile page" on public.profile_extras for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- The pinned catch must be yours and not private; showcase items must be well-formed, and tournament
-- trophies must really be in the Hall of Fame under your name.
create or replace function public.profile_extras_check() returns trigger
language plpgsql security definer set search_path = public as $$
declare it jsonb; k text;
begin
  new.updated_at := now();
  if new.pinned_catch_id is not null then
    if not exists (select 1 from public.catches where id = new.pinned_catch_id and created_by = new.user_id and deleted_at is null and visibility <> 'private') then
      raise exception 'You can only pin one of your own catches that is not private.'; end if;
  end if;
  for it in select * from jsonb_array_elements(new.showcase) loop
    k := it ->> 'k';
    if k not in ('trophy', 'badge', 'catch', 'custom') then raise exception 'bad showcase item'; end if;
    if char_length(coalesce(it ->> 'title', '')) > 60 or char_length(coalesce(it ->> 'detail', '')) > 120 or char_length(coalesce(it ->> 'icon', '')) > 8 then
      raise exception 'showcase text is too long'; end if;
    if k = 'trophy' and not exists (select 1 from public.hall_of_fame() h where h.user_id = new.user_id
        and h.tournament_id::text = it ->> 'tid' and h.board = it ->> 'board' and h.rank = (it ->> 'rank')::int) then
      raise exception 'That trophy isn''t in the Hall of Fame under your name.'; end if;
    if k = 'catch' and not exists (select 1 from public.catches where id::text = it ->> 'id' and created_by = new.user_id and deleted_at is null and visibility <> 'private') then
      raise exception 'Showcase catches must be your own and not private.'; end if;
  end loop;
  return new;
end $$;
create or replace trigger profile_extras_check before insert or update on public.profile_extras
  for each row execute function public.profile_extras_check();

-- Profile pictures: private bucket, 1 MB, own folder; readable by whoever may view that profile
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('avatars', 'avatars', false, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do nothing;
create policy "members upload own avatar" on storage.objects for insert
  with check (bucket_id = 'avatars' and public.is_member() and (storage.foldername(name))[1] = auth.uid()::text);
create policy "view allowed avatars" on storage.objects for select
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.can_view_profile(((storage.foldername(name))[1])::uuid)));
create policy "owners delete own avatar" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
