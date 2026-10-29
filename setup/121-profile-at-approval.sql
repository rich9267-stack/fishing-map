-- 121: 👥 New members can be found as soon as they are approved (v244, migration `profile_at_approval`).
-- Before: the profile (name + @handle that people search) was only made at the member's first sign-in after approval, so an approved person
-- who had not opened the app yet could not be found or added as a friend.
-- Now: review_access makes the profile the moment an admin approves someone who already has a login (ensure_profile still makes it at first
-- sign-in for anyone approved before they signed up). The starter friendships (crew circle + whoever invited them) moved into one helper,
-- private.start_profile, so they happen exactly once, whichever comes first. Rules unchanged.
-- members.first_opened_at: when the member first opened the app while approved (set by ensure_profile). Only admins can read the members list,
-- so only admins see who hasn't opened the app yet. Existing members are filled in from their profile's creation time.
-- No new tables (new column on members).

alter table public.members add column if not exists first_opened_at timestamptz;
update public.members m set first_opened_at = p.created_at
  from auth.users u join public.profiles p on p.user_id = u.id
 where lower(u.email) = m.email and m.first_opened_at is null;

-- make the profile + starter friendships once (returns the profile; does nothing if it already exists)
create or replace function private.start_profile(p_user uuid, p_email text) returns public.profiles
language plpgsql security definer set search_path = public as $$
declare m public.members; p public.profiles; o record;
begin
  select * into m from public.members where email = lower(p_email);
  if m.email is null or m.status <> 'approved' then return null; end if;
  select * into p from public.profiles where user_id = p_user;
  if p.user_id is not null then return p; end if;
  -- never build a name or @handle from the email address
  insert into public.profiles (user_id, handle, display_name)
  values (p_user, public.make_handle(coalesce(nullif(btrim(m.display_name), ''), 'angler')), coalesce(nullif(btrim(m.display_name), ''), 'New angler'))
  returning * into p;
  -- starter friendships happen ONCE, when the profile is first made, so removing a friend sticks
  if m.crew then
    for o in select pr.user_id from public.profiles pr join auth.users u on u.id = pr.user_id
             join public.members mm on mm.email = lower(u.email) where mm.crew and mm.status = 'approved' and pr.user_id <> p_user loop
      insert into public.friendships (user_a, user_b, status, requested_by) values (least(p_user, o.user_id), greatest(p_user, o.user_id), 'accepted', p_user)
      on conflict (user_a, user_b) do nothing;
    end loop;
  end if;
  if m.invited_by is not null and m.invited_by <> p_user and exists (select 1 from public.profiles where user_id = m.invited_by) then
    insert into public.friendships (user_a, user_b, status, requested_by) values (least(p_user, m.invited_by), greatest(p_user, m.invited_by), 'accepted', m.invited_by)
    on conflict (user_a, user_b) do nothing;
  end if;
  return p;
end $$;
revoke all on function private.start_profile(uuid, text) from public, anon, authenticated;

create or replace function public.ensure_profile() returns public.profiles
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); em text := lower(coalesce(auth.jwt() ->> 'email', '')); p public.profiles;
begin
  if me is null then return null; end if;
  p := private.start_profile(me, em);
  if p.user_id is null then return null; end if;
  update public.members set first_opened_at = now() where email = em and first_opened_at is null;
  return p;
end $$;

create or replace function public.review_access(p_email text, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare u uuid;
begin
  if not public.has_power('people') then raise exception 'admins only'; end if;
  update public.members set status = case when p_approve then 'approved' else 'blocked' end
  where email = lower(btrim(p_email)) and status in ('pending', 'blocked') and not is_admin;
  if p_approve then   -- findable right away, even before they open the app
    select id into u from auth.users where lower(email) = lower(btrim(p_email));
    if u is not null then perform private.start_profile(u, p_email); end if;
  end if;
end $$;

-- people approved before this change who haven't opened the app yet get their profile now
do $$ declare r record; begin
  for r in select u.id, m.email from public.members m join auth.users u on lower(u.email) = m.email
           left join public.profiles p on p.user_id = u.id where m.status = 'approved' and p.user_id is null loop
    perform private.start_profile(r.id, r.email);
  end loop;
end $$;

revoke all on function public.ensure_profile(), public.review_access(text, boolean) from public, anon;
grant execute on function public.ensure_profile(), public.review_access(text, boolean) to authenticated;
