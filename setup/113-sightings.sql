-- 113: 👀 Log a sighting (v223, migration `sightings`).
-- sightings: something you SAW (not caught): spot, time, what, how many, note, who can see it (private / friends / public) and one optional photo.
--   * No map pins. Other people only ever get the spot's position rounded to 0.01° (about 0.7 mi: area_lat/area_lng, set by a trigger from the spot,
--     never from the app) so the "👀 seen nearby" lines can count them. Same visibility rule as catches (friends see friends+public, anyone sees public).
--   * One photo per sighting, stored in the photos bucket (path = <my id>/<uuid>.jpg, small copy <uuid>.t.jpg); photo_fp = SHA-256 of the picture, photo_taken_at = time in the photo.
--   * Removed with the person's account (on delete cascade) and with the spot.
-- claim_sighting_coins(): 1 coin per 🌎 Public sighting with a photo, at most 10 a day (New York day of the sighting).
--   Photo checks: named properly (not "unknown"), photo time within 24 h before / 1 h after the sighting was logged, photo not hidden, and the same
--   picture not used before (another sighting's fingerprint or time, or one of my catch photos with the same time). Failing sightings still save; they just don't pay.
create table if not exists public.sightings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  spot_id uuid not null references public.spots(id) on delete cascade,
  seen_at timestamptz not null default now(),
  species text not null check (char_length(btrim(species)) between 2 and 60),
  how_many integer not null default 1 check (how_many between 1 and 5000),
  notes text check (char_length(notes) <= 500),
  visibility text not null default 'private' check (visibility in ('private', 'friends', 'public')),
  area_lat double precision, area_lng double precision,
  photo_path text check (char_length(photo_path) <= 120),
  photo_taken_at timestamptz,
  photo_fp text check (char_length(photo_fp) <= 80),
  hidden_at timestamptz
);
create index if not exists sightings_by_user on public.sightings (created_by, created_at desc);
create index if not exists sightings_area on public.sightings (visibility, seen_at desc);
alter table public.sightings enable row level security;
revoke all on public.sightings from anon, public;
grant select, insert, update, delete on public.sightings to authenticated;

create policy "see sightings" on public.sightings for select to authenticated using (
  public.is_member() and (created_by = auth.uid() or (hidden_at is null and (
    (visibility in ('friends', 'public') and public.is_friend(created_by)) or (visibility = 'public' and not public.is_blocked(created_by))))));
create policy "add own sightings" on public.sightings for insert to authenticated with check (
  public.is_member() and created_by = auth.uid() and public.can_see_spot(spot_id)
  and (photo_path is null or split_part(photo_path, '/', 1) = auth.uid()::text));
create policy "edit own sightings" on public.sightings for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "delete own sightings" on public.sightings for delete to authenticated using (created_by = auth.uid());

create or replace function public.sightings_before() returns trigger language plpgsql security definer set search_path = public as $$
declare s record; n int;
begin
  select lat, lng into s from public.spots where id = new.spot_id;
  if not found then raise exception 'unknown spot'; end if;
  new.area_lat := round(s.lat::numeric, 2)::double precision; new.area_lng := round(s.lng::numeric, 2)::double precision;
  new.species := btrim(new.species);
  if tg_op = 'INSERT' then
    select count(*) into n from public.sightings where created_by = new.created_by and created_at > now() - interval '1 day';
    if n >= 40 then raise exception 'too many sightings today'; end if;
    new.seen_at := least(greatest(new.seen_at, now() - interval '14 days'), now() + interval '5 minutes');
    new.hidden_at := null;
  else   -- only what you saw, how many, the note and who sees it can change later
    new.created_by := old.created_by; new.created_at := old.created_at; new.seen_at := old.seen_at; new.spot_id := old.spot_id;
    new.photo_path := old.photo_path; new.photo_taken_at := old.photo_taken_at; new.photo_fp := old.photo_fp; new.hidden_at := old.hidden_at;
  end if;
  return new;
end $$;
revoke all on function public.sightings_before() from public, anon, authenticated;
create trigger sightings_before before insert or update on public.sightings for each row execute function public.sightings_before();

-- the photo files of sightings can be opened by whoever can see the sighting (RLS on sightings decides)
alter policy "members view visible photos" on storage.objects using (
  bucket_id = 'photos' and ((storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.photos p where p.path = objects.name)
    or exists (select 1 from public.sightings s where s.photo_path = objects.name)));
alter policy "members view small copies of visible photos" on storage.objects using (
  bucket_id = 'photos' and right(name, 6) = '.t.jpg' and (
    exists (select 1 from public.photos p where p.path = left(objects.name, length(objects.name) - 6) || '.jpg')
    or exists (select 1 from public.sightings s where s.photo_path = left(objects.name, length(objects.name) - 6) || '.jpg')));

create or replace function public.claim_sighting_coins() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  u uuid := auth.uid(); r record; vday date; used int; give int; dup boolean;
  cap constant int := 10;
  added jsonb := '[]'::jsonb;
begin
  if u is null or not public.is_member() then raise exception 'sign in first'; end if;
  for r in
    select x.* from public.sightings x
    where x.created_by = u and x.created_at >= now() - interval '7 days' and x.visibility = 'public' and x.hidden_at is null
      and x.photo_path is not null and x.photo_taken_at is not null
      and not exists (select 1 from public.coin_ledger l where l.user_id = u and l.ref = 'sighting:' || x.id)
    order by x.created_at
  loop
    vday := (r.created_at at time zone 'America/New_York')::date;
    dup := exists (select 1 from public.sightings o where o.created_by = u and o.id <> r.id and (o.created_at, o.id) < (r.created_at, r.id)
                     and (o.photo_fp = r.photo_fp or o.photo_taken_at = r.photo_taken_at))
        or exists (select 1 from public.photos p where p.created_by = u and p.taken_at = r.photo_taken_at);
    if lower(btrim(r.species)) in ('something', 'unknown', 'fish', 'a fish', 'idk', 'not sure', 'n/a', 'none')
       or r.photo_taken_at < r.created_at - interval '24 hours' or r.photo_taken_at > r.created_at + interval '1 hour' or dup then
      perform public._coin_grant(u, 'coins', 0, 'sighting', 'sighting:' || r.id, vday, r.species);   -- a 0 row marks it as looked at
      continue;
    end if;
    select coalesce(sum(amount), 0) into used from public.coin_ledger where user_id = u and currency = 'coins' and reason = 'sighting' and day = vday;
    give := greatest(0, least(1, cap - used));
    perform public._coin_grant(u, 'coins', give, 'sighting', 'sighting:' || r.id, vday, r.species);
    if give > 0 then added := added || jsonb_build_array(jsonb_build_object('reason', 'sighting', 'coins', give, 'note', r.species)); end if;
  end loop;
  return jsonb_build_object('added', added);
end $$;
revoke all on function public.claim_sighting_coins() from public, anon;
grant execute on function public.claim_sighting_coins() to authenticated;
