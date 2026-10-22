-- 97: Own Fish ID model, step 1 (ALREADY APPLIED live Oct 21 2026 as migration `fishid_training_optin`; this file is the saved copy, safe to re-run).
-- Members can opt in to let their Friends / Public catch photos (with the species they saved) help train Fishing Map's own Fish ID someday.
-- Opted in = a row here. Deleting the account removes the row (cascade). Never Private catches. Nothing is copied: a deleted catch,
-- photo or account drops out of the list by itself. Terms/Privacy promise unchanged: deleting a catch or account takes its photos out.
create table if not exists public.fishid_training_optin (
  user_id uuid primary key references auth.users(id) on delete cascade,
  opted_in_at timestamptz not null default now()
);
alter table public.fishid_training_optin enable row level security;
drop policy if exists "own optin read" on public.fishid_training_optin;
drop policy if exists "own optin add" on public.fishid_training_optin;
drop policy if exists "own optin remove" on public.fishid_training_optin;
create policy "own optin read"   on public.fishid_training_optin for select to authenticated using (user_id = auth.uid());
create policy "own optin add"    on public.fishid_training_optin for insert to authenticated with check (user_id = auth.uid());
create policy "own optin remove" on public.fishid_training_optin for delete to authenticated using (user_id = auth.uid());
revoke all on public.fishid_training_optin from anon, public;
grant select, insert, delete on public.fishid_training_optin to authenticated;

-- Owner only: the training photos = photos of opted-in members' Friends/Public catches that have a species,
-- not deleted, not hidden.
create or replace function public.fishid_training_list()
returns table (catch_id uuid, species text, path text)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'Owner only.'; end if;
  return query
    select c.id, c.species, p.path
    from public.catches c
    join public.fishid_training_optin o on o.user_id = c.created_by
    join public.photos p on p.catch_id = c.id and p.created_by = c.created_by
    where c.deleted_at is null and p.hidden_at is null
      and coalesce(c.visibility, 'friends') in ('friends', 'public')
      and nullif(trim(c.species), '') is not null
    order by c.species, c.id;
end $$;
revoke all on function public.fishid_training_list() from anon, public;
grant execute on function public.fishid_training_list() to authenticated;
