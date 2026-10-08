-- Per-spot tide timing (applied via the Supabase connector, Oct 8 2026)
alter table public.spots
  add column if not exists tide_offset_min smallint not null default 0 check (tide_offset_min between -300 and 300);
