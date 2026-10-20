-- 91: tackle box gets three more kinds (plans/ui-review.md item 6): spear (speargun / pole spear), net (cast net), bow (bowfishing).
-- Only widens the check rule from setup/29; no table, column, policy or grant changes. Existing rows are all still allowed.
-- Undo (only if no row uses a new kind): alter table public.tackle drop constraint tackle_kind_check,
--   add constraint tackle_kind_check check (kind in ('bait','lure','rod','line','other'));
alter table public.tackle
  drop constraint if exists tackle_kind_check,
  add constraint tackle_kind_check check (kind in ('bait','lure','rod','line','other','spear','net','bow'));
