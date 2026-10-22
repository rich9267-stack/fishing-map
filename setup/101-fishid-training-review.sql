-- 101: Own Fish ID model, step 2 (owner-only review screen, js/57). Applied live Oct 22 2026 as migration `fishid_training_review`;
-- this file is the saved copy, safe to re-run. Needs setup/97 (fishid_training_optin, fishid_training_list) and setup/79 (is_owner).
-- Nothing is copied or stored: the owner only LOOKS at photos that are already in the training list, straight from storage.
-- Deleting a catch/photo/account or unticking the box drops a photo out of the list, so the owner can't see it any more either.

-- How many members ticked the box (owner only).
create or replace function public.fishid_training_members()
returns integer
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'Owner only.'; end if;
  return (select count(*)::int from public.fishid_training_optin);
end $$;
revoke all on function public.fishid_training_members() from anon, public;
grant execute on function public.fishid_training_members() to authenticated;

-- Is this storage file a training photo, and is the caller the owner? (false for everyone else; used by the storage rule below)
-- Same filters as fishid_training_list(): opted in, Friends/Public, has a species, not deleted, not hidden.
create or replace function public.fishid_training_has_path(p_name text)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_owner() and exists (
    select 1
    from public.photos p
    join public.catches c on c.id = p.catch_id and c.created_by = p.created_by
    join public.fishid_training_optin o on o.user_id = c.created_by
    where p.path = p_name and p.hidden_at is null and c.deleted_at is null
      and coalesce(c.visibility, 'friends') in ('friends', 'public')
      and nullif(trim(c.species), '') is not null);
$$;
revoke all on function public.fishid_training_has_path(text) from anon, public;
grant execute on function public.fishid_training_has_path(text) to authenticated;

-- The owner may open (view) training photos even of Friends catches of people who aren't the owner's friends. View only.
drop policy if exists "owner views fish id training photos" on storage.objects;
create policy "owner views fish id training photos" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.fishid_training_has_path(name));
