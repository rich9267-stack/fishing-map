-- Fishing Map: moon phase, solunar period, and where the catch's conditions came from.
-- Already applied to the live database on Oct 8, 2026; kept here for the record.
alter table public.catches
  add column if not exists moon_phase  text check (moon_phase in ('new moon','waxing crescent','first quarter','waxing gibbous','full moon','waning gibbous','last quarter','waning crescent')),
  add column if not exists moon_illum  integer check (moon_illum between 0 and 100),
  add column if not exists solunar     text check (solunar in ('major','minor')),
  add column if not exists conditions_source text check (char_length(conditions_source) <= 40);
