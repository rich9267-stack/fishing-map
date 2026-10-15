-- 56: 🏷 Host pages (clubs and businesses) — step 1 of "Host" tournaments (Oct 14, 2026).
-- A Host page is a second identity owned by one regular account (a club, or a business such as a tackle shop or charter).
-- Step 1 = the pages themselves: ask for one, Richard approves, owner edits it, everyone can browse approved ones.
-- (Step 2 = switch into a page and run tournaments as it; step 3 = follow a page and get its alerts.)
-- Rules:
--   * kind 'club'     : one account may own as many as it likes (up to 3 waiting for approval at a time).
--   * kind 'business' : each account is allowed 1 by default; Richard can raise one person's allowance (host_limits) any time.
--   * Nothing is written directly: everything goes through the functions below. Only approved pages are visible to others.
--   * The name is fixed once asked for (the owner can't rename an approved page); the admin can close a page.
-- Written with create / alter / grant only, so the Supabase connector can apply it.

create table if not exists public.host_pages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('club', 'business')),
  name text not null check (char_length(btrim(name)) between 3 and 40),
  about text check (about is null or char_length(about) <= 300),
  area text check (area is null or char_length(area) <= 60),
  accent text check (accent is null or accent ~ '^#[0-9a-fA-F]{6}$'),
  avatar_path text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'closed')),
  request_note text check (request_note is null or char_length(request_note) <= 300),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);
-- two live pages can't share a name (stops copies / impersonation)
create unique index if not exists host_pages_live_name_key on public.host_pages (lower(btrim(name))) where status in ('pending', 'approved');
create index if not exists host_pages_owner_idx on public.host_pages (owner);
alter table public.host_pages enable row level security;

-- How many business pages one person may have (default 1 when there is no row). Only the admin changes it.
create table if not exists public.host_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_allowed int not null default 1 check (business_allowed between 0 and 10),
  updated_at timestamptz not null default now()
);
alter table public.host_limits enable row level security;

-- Reading: approved pages (not from blocked owners), your own pages, and everything for the admin.
create policy "see host pages" on public.host_pages for select using (
  public.is_member() and (owner = auth.uid() or public.is_admin() or (status = 'approved' and not coalesce(public.is_blocked(owner), false))));
create policy "admin sees limits" on public.host_limits for select using (public.is_admin());
-- (no insert / update / delete policies: only the security-definer functions below write)

create or replace function public.business_pages_used(u uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.host_pages where owner = u and kind = 'business' and status in ('pending', 'approved');
$$;
create or replace function public.business_pages_allowed(u uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select business_allowed from public.host_limits where user_id = u), 1);
$$;

-- Ask for a page. Clubs: any number. Business: up to your allowance.
create or replace function public.request_host_page(p_kind text, p_name text, p_about text default null, p_area text default null, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); nm text := btrim(coalesce(p_name, '')); pid uuid;
begin
  if me is null or not public.is_member() then raise exception 'sign in first'; end if;
  if p_kind not in ('club', 'business') then raise exception 'pick club or business'; end if;
  if char_length(nm) < 3 or char_length(nm) > 40 then raise exception 'The name needs 3 to 40 letters.'; end if;
  if (select count(*) from public.host_pages where owner = me and status = 'pending') >= 3 then
    raise exception 'You already have 3 requests waiting. Wait for a decision first.'; end if;
  if p_kind = 'business' and public.business_pages_used(me) >= public.business_pages_allowed(me) then
    raise exception 'You already have your allowed number of business pages. Ask the admin if you need another.'; end if;
  if exists (select 1 from public.host_pages where lower(btrim(name)) = lower(nm) and status in ('pending', 'approved')) then
    raise exception 'A page with that name already exists. Pick another name.'; end if;
  insert into public.host_pages (owner, kind, name, about, area, request_note)
  values (me, p_kind, nm, nullif(left(btrim(coalesce(p_about, '')), 300), ''), nullif(left(btrim(coalesce(p_area, '')), 60), ''),
          nullif(left(btrim(coalesce(p_note, '')), 300), ''))
  returning id into pid;
  return pid;
end $$;

-- The owner edits the look of a page (not its name or kind). p_avatar must be inside the page's own folder.
create or replace function public.update_host_page(p_id uuid, p_about text, p_area text, p_accent text, p_avatar text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.host_pages where id = p_id and owner = auth.uid() and status in ('pending', 'approved')) then
    raise exception 'That isn''t your page.'; end if;
  if p_avatar is not null and p_avatar not like p_id::text || '/%' then raise exception 'bad picture'; end if;
  update public.host_pages set
    about = nullif(left(btrim(coalesce(p_about, '')), 300), ''),
    area = nullif(left(btrim(coalesce(p_area, '')), 60), ''),
    accent = case when p_accent ~ '^#[0-9a-fA-F]{6}$' then p_accent else null end,
    avatar_path = p_avatar
  where id = p_id;
end $$;

-- Owner or admin closes a page (frees the business slot). Closed pages vanish for everyone but the admin.
create or replace function public.close_host_page(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_admin() or exists (select 1 from public.host_pages where id = p_id and owner = auth.uid())) then
    raise exception 'only the owner or an admin'; end if;
  update public.host_pages set status = 'closed', reviewed_at = coalesce(reviewed_at, now()) where id = p_id and status in ('pending', 'approved', 'declined');
end $$;

-- Admin approves or declines a waiting request.
create or replace function public.review_host_page(p_id uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  update public.host_pages set status = case when p_approve then 'approved' else 'declined' end, reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_id and status = 'pending';
end $$;

-- Admin raises or lowers how many business pages one person may have (0 to 10).
create or replace function public.set_business_allowance(p_user uuid, p_n int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  if p_n is null or p_n < 0 or p_n > 10 then raise exception 'pick 0 to 10'; end if;
  insert into public.host_limits (user_id, business_allowed, updated_at) values (p_user, p_n, now())
  on conflict (user_id) do update set business_allowed = excluded.business_allowed, updated_at = now();
end $$;

-- Everything the app needs for the Clubs & businesses screen, in one call:
-- approved pages + my own (any status except closed), with the owner's name, and my business allowance.
create or replace function public.host_pages_list() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null or not public.is_member() then raise exception 'sign in first'; end if;
  return jsonb_build_object(
    'business_allowed', public.business_pages_allowed(me),
    'business_used', public.business_pages_used(me),
    'pages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', h.id, 'kind', h.kind, 'name', h.name, 'about', h.about, 'area', h.area, 'accent', h.accent, 'avatar_path', h.avatar_path,
        'status', h.status, 'owner', h.owner, 'owner_name', p.display_name, 'owner_handle', p.handle, 'is_mine', h.owner = me,
        'created_at', h.created_at) order by h.kind, lower(h.name))
      from public.host_pages h left join public.profiles p on p.user_id = h.owner
      where (h.status = 'approved' and not coalesce(public.is_blocked(h.owner), false)) or (h.owner = me and h.status <> 'closed')), '[]'::jsonb));
end $$;

-- Admin screen: waiting requests and live pages, with each owner's business allowance.
create or replace function public.host_pages_admin() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', h.id, 'kind', h.kind, 'name', h.name, 'about', h.about, 'area', h.area, 'status', h.status, 'note', h.request_note,
      'created_at', h.created_at, 'owner', h.owner, 'owner_name', p.display_name, 'owner_handle', p.handle,
      'business_allowed', public.business_pages_allowed(h.owner), 'business_used', public.business_pages_used(h.owner))
      order by (h.status = 'pending') desc, h.created_at desc)
    from public.host_pages h left join public.profiles p on p.user_id = h.owner
    where h.status in ('pending', 'approved')), '[]'::jsonb);
end $$;

grant execute on function public.business_pages_used(uuid), public.business_pages_allowed(uuid),
  public.request_host_page(text, text, text, text, text), public.update_host_page(uuid, text, text, text, text),
  public.close_host_page(uuid), public.review_host_page(uuid, boolean), public.set_business_allowance(uuid, int),
  public.host_pages_list(), public.host_pages_admin() to authenticated;

-- Page pictures: private bucket, one folder per page. The owner uploads / removes, any member can view an approved page's picture.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('host-avatars', 'host-avatars', false, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do nothing;
create policy "owner uploads host picture" on storage.objects for insert with check (
  bucket_id = 'host-avatars' and exists (select 1 from public.host_pages h where h.id::text = (storage.foldername(objects.name))[1]
    and h.owner = auth.uid() and h.status in ('pending', 'approved')));
create policy "members view host picture" on storage.objects for select using (
  bucket_id = 'host-avatars' and public.is_member() and exists (select 1 from public.host_pages h where h.id::text = (storage.foldername(objects.name))[1]
    and (h.status = 'approved' or h.owner = auth.uid() or public.is_admin())));
create policy "owner deletes host picture" on storage.objects for delete using (
  bucket_id = 'host-avatars' and exists (select 1 from public.host_pages h where h.id::text = (storage.foldername(objects.name))[1] and h.owner = auth.uid()));
