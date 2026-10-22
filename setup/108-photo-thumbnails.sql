-- 108: let members open the small copy of a photo they are allowed to see (v172 photo data saving).
-- The app (js/03) uploads a ~20 KB small copy "<name>.t.jpg" next to every photo "<name>.jpg" in the 'photos' bucket.
-- The existing rule "members view visible photos" only opens a file whose exact name is a row in public.photos, so friends
-- could not open each other's small copies. This adds a second view-only rule: a "<name>.t.jpg" file opens exactly when
-- "<name>.jpg" is a photo row you can see. The photos table's own rules (members only, hidden photos, private catches,
-- blocked people, friends-only) decide that, so nobody sees a small copy of a photo they can't already see.
-- Nothing else changes: no new table (backup unaffected), no function, no grants. Uploading/deleting is still own folder only.

drop policy if exists "members view small copies of visible photos" on storage.objects;
create policy "members view small copies of visible photos" on storage.objects for select to authenticated
  using (
    bucket_id = 'photos'
    and right(name, 6) = '.t.jpg'
    and exists (select 1 from public.photos p where p.path = left(objects.name, length(objects.name) - 6) || '.jpg')
  );

-- Undo (if ever needed):
-- drop policy if exists "members view small copies of visible photos" on storage.objects;
