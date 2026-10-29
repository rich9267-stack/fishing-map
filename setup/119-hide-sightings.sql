-- 119: 🙈 Admins can hide a public sighting (v239, migration `hide_sightings`). Finishes item 8 of the progress log (setup/113).
-- Same power as hiding spots ("Hide public spots" box). A hidden sighting drops out of everyone's "👀 Seen nearby" lines (the RLS in setup/113
-- already skips hidden_at rows for other people), its photo can't be opened by others (the storage policy checks the same RLS), and it earns no coins.
-- The owner still sees it in Profile → Sightings and gets an alert with the reason. Reversible: Admin → 👀 Sightings → Show again.
-- admin_public_sightings(): the last N days of 🌎 Public sightings (hidden ones too), for the Admin tab. Notes are left out (nobody else ever sees them).
-- No new tables.

-- the trigger keeps hidden_at fixed on member edits; only hide_sighting / unhide_sighting (app.admin_rpc) may change it
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
    new.photo_path := old.photo_path; new.photo_taken_at := old.photo_taken_at; new.photo_fp := old.photo_fp;
    if coalesce(current_setting('app.admin_rpc', true), '') <> '1' then new.hidden_at := old.hidden_at; end if;
  end if;
  return new;
end $$;
revoke all on function public.sightings_before() from public, anon, authenticated;

create or replace function public.hide_sighting(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare s record;
begin
  if not public.has_power('hide_spots') then raise exception 'You need the "Hide public spots & sightings" box for that'; end if;
  p_reason := trim(coalesce(p_reason, ''));
  if length(p_reason) < 5 then raise exception 'Write a reason (at least 5 letters)'; end if;
  select id, species, created_by, visibility, hidden_at into s from public.sightings where id = p_id;
  if not found then raise exception 'Sighting not found'; end if;
  if s.visibility <> 'public' then raise exception 'Only public sightings can be hidden'; end if;
  if s.created_by = auth.uid() then raise exception 'That is your own sighting'; end if;
  if s.hidden_at is not null then raise exception 'Already hidden'; end if;
  perform set_config('app.admin_rpc', '1', true);
  update public.sightings set hidden_at = now() where id = p_id;
  perform set_config('app.admin_rpc', '', true);
  perform private.log_admin('sighting_hidden', 'sighting', p_id::text, s.species || ' · reason: ' || left(p_reason, 150));
  perform public.enqueue_notification(s.created_by, 'safety', '👀 Your sighting was hidden from others',
    left('The team hid your "' || s.species || '" sighting from other people. Only you can still see it. Reason: ' || p_reason, 160), '?go=sightings',
    'hidesg:' || p_id::text || ':' || extract(epoch from now())::bigint::text);
end $$;

create or replace function public.unhide_sighting(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare sp text;
begin
  if not public.has_power('hide_spots') then raise exception 'You need the "Hide public spots & sightings" box for that'; end if;
  select species into sp from public.sightings where id = p_id and hidden_at is not null;
  if not found then raise exception 'That sighting is not hidden'; end if;
  perform set_config('app.admin_rpc', '1', true);
  update public.sightings set hidden_at = null where id = p_id;
  perform set_config('app.admin_rpc', '', true);
  perform private.log_admin('sighting_unhidden', 'sighting', p_id::text, sp);
end $$;

create or replace function public.admin_public_sightings(p_days integer default 14)
returns table(id uuid, species text, how_many integer, seen_at timestamptz, who text, photo_path text, hidden_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_power('hide_spots') then raise exception 'admins only'; end if;
  return query
    select x.id, x.species, x.how_many, x.seen_at,
           (select coalesce(m.display_name, u.email)::text from auth.users u left join public.members m on lower(m.email) = lower(u.email) where u.id = x.created_by),
           x.photo_path, x.hidden_at
    from public.sightings x
    where x.visibility = 'public' and x.created_at > now() - make_interval(days => least(greatest(p_days, 1), 60))
    order by x.created_at desc limit 200;
end $$;

revoke all on function public.hide_sighting(uuid, text), public.unhide_sighting(uuid), public.admin_public_sightings(integer) from public, anon;
grant execute on function public.hide_sighting(uuid, text), public.unhide_sighting(uuid), public.admin_public_sightings(integer) to authenticated;
