-- Fishing Map: "soft delete" for catches. Deleting in the app sets deleted_at;
-- the row stays in the database so a mistaken delete can be undone in Supabase
-- (Table Editor -> catches -> clear the deleted_at value).
-- Already applied to the live database on Oct 8, 2026; kept here for the record.
alter table public.catches add column if not exists deleted_at timestamptz;
create index if not exists catches_live_idx on public.catches (spot_id, caught_at desc) where deleted_at is null;
