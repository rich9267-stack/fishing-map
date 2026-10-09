-- Fix: new members were auto-friended with EVERYONE (members.crew defaulted to true).
-- Now: only the original circle (crew) auto-friends; a new member is auto-friended only with whoever invited them.
alter table public.members alter column crew set default false;
alter table public.members add column if not exists invited_by uuid references auth.users(id);
update public.members set crew = false where email in ('limpertaj@gmail.com', 'superadao@gmail.com');
update public.members set invited_by = 'c8e14cdb-6c6a-4e89-90a6-3d39a0068139' where email = 'limpertaj@gmail.com';

create or replace function public.ensure_profile() returns public.profiles language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); m public.members; p public.profiles; o record;
begin
  if me is null then return null; end if;
  select * into m from public.members where email = lower(coalesce(auth.jwt() ->> 'email', ''));
  if m.email is null or m.status <> 'approved' then return null; end if;
  select * into p from public.profiles where user_id = me;
  if p.user_id is null then
    insert into public.profiles (user_id, handle, display_name)
    values (me, public.make_handle(coalesce(m.display_name, split_part(m.email, '@', 1))), coalesce(nullif(btrim(m.display_name), ''), split_part(m.email, '@', 1)))
    returning * into p;
  end if;
  if m.crew then
    for o in select pr.user_id from public.profiles pr join auth.users u on u.id = pr.user_id
             join public.members mm on mm.email = lower(u.email) where mm.crew and mm.status = 'approved' and pr.user_id <> me loop
      insert into public.friendships (user_a, user_b, status, requested_by) values (least(me, o.user_id), greatest(me, o.user_id), 'accepted', me)
      on conflict (user_a, user_b) do update set status = 'accepted';
    end loop;
  end if;
  -- the person who invited me becomes my friend (only them)
  if m.invited_by is not null and m.invited_by <> me and exists (select 1 from public.profiles where user_id = m.invited_by) then
    insert into public.friendships (user_a, user_b, status, requested_by) values (least(me, m.invited_by), greatest(me, m.invited_by), 'accepted', m.invited_by)
    on conflict (user_a, user_b) do update set status = 'accepted';
  end if;
  return p;
end $$;
grant execute on function public.ensure_profile() to authenticated;
