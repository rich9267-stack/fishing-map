-- 109: a header (cover) image for my Profile screen. One nullable text column; the picture itself lives in the same private
-- "avatars" bucket as profile pictures (own folder, file name starts with "cover-"), so the existing rules already decide who may see it:
-- the owner, and whoever may view that profile page (policy "view allowed avatars", setup/35). Nothing else changes.
alter table public.profile_extras add column if not exists cover_path text;
