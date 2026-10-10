-- 38: removed friends stay removed + names/handles never come from the email address.
-- Bug: ensure_profile() runs on every sign-in and re-created the "crew" and inviter friendships each time,
-- so a removed friend came back after a refresh. Now starter friendships happen once, when the profile is first made.
-- New profiles without a name get "New angler" / @angler (never part of the email address).
create or replace function public.ensure_profile() returns public.profiles
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); m public.members; p public.profiles; o record; created boolean := false;
begin
  if me is null then return null; end if;
  select * into m from public.members where email = lower(coalesce(auth.jwt() ->> 'email', ''));
  if m.email is null or m.status <> 'approved' then return null; end if;
  select * into p from public.profiles where user_id = me;
  if p.user_id is null then
    insert into public.profiles (user_id, handle, display_name)
    values (me, public.make_handle(coalesce(nullif(btrim(m.display_name), ''), 'angler')), coalesce(nullif(btrim(m.display_name), ''), 'New angler'))
    returning * into p;
    created := true;
  end if;
  if created and m.crew then
    for o in select pr.user_id from public.profiles pr join auth.users u on u.id = pr.user_id
             join public.members mm on mm.email = lower(u.email) where mm.crew and mm.status = 'approved' and pr.user_id <> me loop
      insert into public.friendships (user_a, user_b, status, requested_by) values (least(me, o.user_id), greatest(me, o.user_id), 'accepted', me)
      on conflict (user_a, user_b) do nothing;
    end loop;
  end if;
  if created and m.invited_by is not null and m.invited_by <> me and exists (select 1 from public.profiles where user_id = m.invited_by) then
    insert into public.friendships (user_a, user_b, status, requested_by) values (least(me, m.invited_by), greatest(me, m.invited_by), 'accepted', m.invited_by)
    on conflict (user_a, user_b) do nothing;
  end if;
  return p;
end $$;
