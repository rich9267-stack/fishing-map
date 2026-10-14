-- 52: 📩 Send a spot to one friend (Oct 14, Fishbrain audit item 8).
-- The owner shares ONE spot with ONE friend: that friend then sees it with its exact pin and notes — even a 🔒 private spot,
-- or one whose exact pin is hidden from friends. Nobody else does. The owner's catches there keep their own privacy.
-- Sharing also sends the friend a chat message (so they get the usual message alert). Stopping a share sets revoked_at
-- (rows are never deleted — the Supabase connector refuses deletes). Only create / alter-add / create-or-replace / grant.

create table public.spot_shares (
  id bigserial primary key,
  spot_id uuid not null references public.spots(id) on delete cascade,
  owner uuid not null references auth.users(id) on delete cascade,
  friend uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create unique index spot_shares_one on public.spot_shares (spot_id, friend) where revoked_at is null;
create index spot_shares_friend on public.spot_shares (friend) where revoked_at is null;
alter table public.spot_shares enable row level security;
create policy "see own shares" on public.spot_shares for select using (public.is_member() and (owner = auth.uid() or friend = auth.uid()));
grant select on public.spot_shares to authenticated;

create function public.spot_shared_with_me(p_spot uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.spot_shares x where x.spot_id = p_spot and x.friend = auth.uid() and x.revoked_at is null
                 and public.is_friend(x.owner) and not public.is_blocked(x.owner))
$$;
grant execute on function public.spot_shared_with_me(uuid) to authenticated;

-- same columns as before; a spot shared with you counts as "exact" and is listed even if it's private
create or replace function public.spots_visible_fn()
 returns table(id uuid, created_at timestamp with time zone, name text, spot_type text, water_type text, notes text, added_by text, public_access text, parking text, getting_there text, access_notes text, lat double precision, lng double precision, created_by uuid, is_private boolean, tide_offset_min smallint, faces_deg smallint, visibility text, hide_exact_from_friends boolean, is_exact boolean)
 language sql stable security definer set search_path to 'public'
as $function$
  select s.id, s.created_at, s.name, s.spot_type, s.water_type,
    case when e.exact then s.notes end, s.added_by, s.public_access, s.parking,
    case when e.exact then s.getting_there end, case when e.exact then s.access_notes end,
    case when e.exact then s.lat else b.blat end,
    case when e.exact then s.lng else b.blng end,
    s.created_by, s.is_private, s.tide_offset_min, s.faces_deg, s.visibility, s.hide_exact_from_friends, e.exact
  from public.spots s
  cross join lateral (select public.spot_shared_with_me(s.id) as shared) sh
  cross join lateral (select (s.created_by = auth.uid() or sh.shared or (s.visibility <> 'private' and not s.hide_exact_from_friends and public.is_friend(s.created_by))) as exact) e
  left join lateral public.blur_point(s.id, s.lat, s.lng) b on (not e.exact and s.lat is not null)
  where s.deleted_at is null and public.is_member() and (s.created_by = auth.uid() or sh.shared or (s.visibility <> 'private' and public.is_friend(s.created_by)) or (s.visibility = 'public' and not public.is_blocked(s.created_by)));
$function$;

create function public.share_spot(p_spot uuid, p_friend uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := auth.uid(); s record;
begin
  if u is null or not public.is_member() then raise exception 'sign in first'; end if;
  select * into s from public.spots where id = p_spot and deleted_at is null;
  if s.id is null or s.created_by <> u then raise exception 'You can only share your own spots.'; end if;
  if p_friend = u then raise exception 'That''s you!'; end if;
  if not exists (select 1 from public.friendships f where f.status = 'accepted' and ((f.user_a = u and f.user_b = p_friend) or (f.user_b = u and f.user_a = p_friend)))
    then raise exception 'You can only share with a friend.'; end if;
  if public.is_blocked(p_friend) then raise exception 'You can''t share with this person.'; end if;
  if exists (select 1 from public.spot_shares where spot_id = p_spot and friend = p_friend and revoked_at is null) then raise exception 'Already shared with them.'; end if;
  if (select count(*) from public.spot_shares where owner = u and created_at > now() - interval '1 day') >= 30 then raise exception 'That''s a lot of sharing today — try again tomorrow.'; end if;
  insert into public.spot_shares (spot_id, owner, friend) values (p_spot, u, p_friend);
  insert into public.messages (sender, recipient, body)
    values (u, p_friend, '📍 I shared a spot with you: ' || s.name || '. It''s on your map now (only you can see it).');
  return jsonb_build_object('ok', true);
end $$;

create function public.unshare_spot(p_spot uuid, p_friend uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := auth.uid(); n int;
begin
  if u is null or not public.is_member() then raise exception 'sign in first'; end if;
  update public.spot_shares set revoked_at = now() where spot_id = p_spot and friend = p_friend and owner = u and revoked_at is null;
  get diagnostics n = row_count;
  return jsonb_build_object('ok', n > 0);
end $$;
grant execute on function public.share_spot(uuid, uuid), public.unshare_spot(uuid, uuid) to authenticated;
