-- Social step C: strangers can request access; the admin approves or declines.
alter table public.members add column if not exists note text check (note is null or char_length(note) <= 300);
alter table public.members add column if not exists requested_at timestamptz;

-- Called by someone who is signed in but not on the list yet
create or replace function public.request_access(p_name text, p_note text) returns text
language plpgsql security definer set search_path = public as $$
declare e text := lower(coalesce(auth.jwt() ->> 'email', '')); st text; nm text := left(btrim(coalesce(p_name, '')), 40);
begin
  if e = '' or auth.uid() is null then raise exception 'sign in first'; end if;
  if nm = '' then raise exception 'name needed'; end if;
  select status into st from public.members where email = e;
  if st is null then
    insert into public.members (email, display_name, status, crew, note, requested_at)
    values (e, nm, 'pending', false, nullif(left(btrim(coalesce(p_note, '')), 300), ''), now());
    return 'pending';
  elsif st = 'pending' then
    update public.members set display_name = nm, note = nullif(left(btrim(coalesce(p_note, '')), 300), '') where email = e;
    return 'pending';
  end if;
  return st; -- already approved, or declined
end $$;
grant execute on function public.request_access(text, text) to authenticated;

-- Admin only: approve or decline a request (a declined request can be approved later)
create or replace function public.review_access(p_email text, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  update public.members set status = case when p_approve then 'approved' else 'blocked' end
  where email = lower(btrim(p_email)) and status in ('pending', 'blocked') and not is_admin;
end $$;
grant execute on function public.review_access(text, boolean) to authenticated;

-- (Step D, migration "public_spots_hide_directions": spots_visible_fn now returns notes, getting_there and access_notes
--  only when the viewer gets the EXACT pin — anyone with a blurred pin gets no written directions. Re-create the
--  function with those three columns wrapped in `case when e.exact then s.<col> end`.)
