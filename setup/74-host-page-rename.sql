-- 74: ✏️ Request a rename for Host pages (Oct 16, 2026, sprint #6 step 3).
-- Until now the owner of a club / business page could not change its name at all (setup/56: "the name is fixed once asked for").
-- Now the owner taps "Request a rename", the admin approves or declines, and the page name only changes when the admin says yes.
-- The admin stays the safety check for business names (stops a page quietly turning into a copy of someone else's shop).
-- Rules:
--   * Only the owner of an APPROVED page can ask. One waiting request per page. 3 to 40 letters, same as a new page.
--   * The new name can't match another live (waiting or approved) page, nor another waiting rename request.
--   * After a rename is approved the page can't ask again for 30 days.
--   * Nothing is written directly: only the functions below write. The owner sees their own requests, the admin sees all.
-- Only create / grant (the Supabase connector refuses removals).

create table if not exists public.host_page_renames (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  page_id uuid not null references public.host_pages(id) on delete cascade,
  requested_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  old_name text not null,
  new_name text not null check (char_length(btrim(new_name)) between 3 and 40),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'cancelled')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);
-- one waiting request per page
create unique index if not exists host_page_renames_one_waiting on public.host_page_renames (page_id) where status = 'pending';
create index if not exists host_page_renames_page_idx on public.host_page_renames (page_id, created_at desc);
alter table public.host_page_renames enable row level security;
create policy "see own rename requests" on public.host_page_renames for select using (
  public.is_member() and (requested_by = auth.uid() or public.is_admin()));
-- (no insert / update policies: only the security-definer functions below write)

-- The owner asks for a new name.
create or replace function public.request_host_page_rename(p_id uuid, p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); nm text := btrim(coalesce(p_name, '')); pg public.host_pages; rid uuid;
begin
  if me is null or not public.is_member() then raise exception 'sign in first'; end if;
  select * into pg from public.host_pages where id = p_id and owner = me and status = 'approved';
  if not found then raise exception 'That isn''t your live page.'; end if;
  if char_length(nm) < 3 or char_length(nm) > 40 then raise exception 'The name needs 3 to 40 letters.'; end if;
  if nm = pg.name then raise exception 'That is already the page name.'; end if;
  if exists (select 1 from public.host_page_renames where page_id = p_id and status = 'pending') then
    raise exception 'You already have a rename waiting for the admin. Cancel it first to ask for a different name.'; end if;
  if exists (select 1 from public.host_page_renames where page_id = p_id and status = 'approved' and reviewed_at > now() - interval '30 days') then
    raise exception 'This page was renamed in the last 30 days. Try again later.'; end if;
  if exists (select 1 from public.host_pages where id <> p_id and lower(btrim(name)) = lower(nm) and status in ('pending', 'approved')) then
    raise exception 'A page with that name already exists. Pick another name.'; end if;
  if exists (select 1 from public.host_page_renames where status = 'pending' and lower(btrim(new_name)) = lower(nm)) then
    raise exception 'Someone else is already asking for that name. Pick another name.'; end if;
  insert into public.host_page_renames (page_id, requested_by, old_name, new_name) values (p_id, me, pg.name, nm) returning id into rid;
  return rid;
end $$;

-- The owner takes a waiting request back.
create or replace function public.cancel_host_page_rename(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_member() then raise exception 'sign in first'; end if;
  update public.host_page_renames set status = 'cancelled', reviewed_at = now()
  where page_id = p_id and requested_by = auth.uid() and status = 'pending';
  if not found then raise exception 'There is no waiting request to cancel.'; end if;
end $$;

-- The admin approves or declines. Approving changes the page name (after checking it is still free).
create or replace function public.review_host_page_rename(p_request uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare rq public.host_page_renames;
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  select * into rq from public.host_page_renames where id = p_request and status = 'pending';
  if not found then raise exception 'That request is no longer waiting.'; end if;
  if p_approve then
    if not exists (select 1 from public.host_pages where id = rq.page_id and status = 'approved') then
      raise exception 'That page is no longer live.'; end if;
    if exists (select 1 from public.host_pages where id <> rq.page_id and lower(btrim(name)) = lower(btrim(rq.new_name)) and status in ('pending', 'approved')) then
      raise exception 'Another page took that name in the meantime. Decline this request.'; end if;
    update public.host_pages set name = btrim(rq.new_name) where id = rq.page_id;
  end if;
  update public.host_page_renames set status = case when p_approve then 'approved' else 'declined' end, reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_request;
end $$;

-- What the owner's screen needs: for each of my pages, the waiting request, or a decision from the last 14 days that said no.
create or replace function public.host_page_renames_mine() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null or not public.is_member() then raise exception 'sign in first'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', x.id, 'page_id', x.page_id, 'new_name', x.new_name, 'status', x.status, 'created_at', x.created_at, 'reviewed_at', x.reviewed_at))
    from (select distinct on (page_id) * from public.host_page_renames where requested_by = me order by page_id, created_at desc) x
    where x.status = 'pending' or (x.status = 'declined' and x.reviewed_at > now() - interval '14 days')), '[]'::jsonb);
end $$;

-- Admin screen: waiting rename requests with the old name, the new name and who asked.
create or replace function public.host_page_renames_admin() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', r.id, 'page_id', r.page_id, 'kind', h.kind, 'old_name', r.old_name, 'new_name', r.new_name, 'created_at', r.created_at,
      'owner', r.requested_by, 'owner_name', p.display_name, 'owner_handle', p.handle) order by r.created_at)
    from public.host_page_renames r join public.host_pages h on h.id = r.page_id left join public.profiles p on p.user_id = r.requested_by
    where r.status = 'pending'), '[]'::jsonb);
end $$;

grant execute on function public.request_host_page_rename(uuid, text), public.cancel_host_page_rename(uuid), public.review_host_page_rename(uuid, boolean),
  public.host_page_renames_mine(), public.host_page_renames_admin() to authenticated;
