-- Admin controls, step 1: Owner + named powers. Nothing changes for anyone today.
-- Owner = Richard (one person only). Admin = today's admins (still every power until step 4 adds tick boxes).
-- New: members.is_owner, is_owner(), admin_power_names(), has_power(name), and a guard so only the
-- SQL Editor / service role can create, change or remove the owner row.
-- No new table, so the weekly backup needs nothing (database-change-rule.md).

alter table public.members add column if not exists is_owner boolean not null default false;

-- the owner is always an approved admin, and there can only be one owner
alter table public.members drop constraint if exists members_owner_is_admin;
alter table public.members add constraint members_owner_is_admin check (not is_owner or (is_admin and status = 'approved'));
create unique index if not exists members_one_owner on public.members (is_owner) where is_owner;

update public.members set is_owner = true where email = 'rich9267@gmail.com' and is_admin and status = 'approved';

-- Guard: from the app (signed-in users) nobody can add an owner row, flip the owner flag,
-- change the owner's admin/status, or delete the owner. The SQL Editor and service role are not signed-in users, so they can.
create or replace function private.guard_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() is distinct from 'authenticated' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if tg_op = 'INSERT' then
    if new.is_owner then raise exception 'The owner account can only be set in the database'; end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if new.is_owner is distinct from old.is_owner
       or (old.is_owner and (new.is_admin is distinct from old.is_admin or new.status is distinct from old.status or new.email is distinct from old.email)) then
      raise exception 'The owner account cannot be changed from the app';
    end if;
    return new;
  else
    if old.is_owner then raise exception 'The owner account cannot be removed'; end if;
    return old;
  end if;
end $$;

drop trigger if exists guard_owner on public.members;
create trigger guard_owner before insert or update or delete on public.members
  for each row execute function private.guard_owner();

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members
    where email = lower(coalesce(auth.jwt() ->> 'email', '')) and is_owner and is_admin and status = 'approved');
$$;

-- Every power a tick box can control later (step 4). 'gated' ones stay owner-only until Legal has checked the wording.
create or replace function public.admin_power_names() returns text[]
language sql immutable as $$
  select array['people','invite','remove_from_list','reports','warn','ban','pages','rules','tournaments','official_places',
               'delete_spot','hide_spots','problems','dashboard','read_log','manage_admins',
               'open_private_spots','review_chat','correct_coins','delete_person_data'];
$$;

-- has_power('ban') => owner always; admin = true for the 16 normal powers (same as today); the 4 gated powers = owner only.
-- Step 4 changes only the admin part to read each admin's ticked boxes.
create or replace function public.has_power(p text) returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  if not (p = any (public.admin_power_names())) then raise exception 'unknown power: %', p; end if;
  if public.is_owner() then return true; end if;
  if p in ('open_private_spots','review_chat','correct_coins','delete_person_data') then return false; end if;
  return public.is_admin();
end $$;

revoke all on function public.is_owner() from public, anon;
revoke all on function public.has_power(text) from public, anon;
grant execute on function public.is_owner() to authenticated;
grant execute on function public.has_power(text) to authenticated;
grant execute on function public.admin_power_names() to authenticated;
