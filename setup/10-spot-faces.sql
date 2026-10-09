-- V4 step 2: which way a spot faces (compass degrees toward open water), for onshore/offshore wind
alter table public.spots add column if not exists faces_deg smallint check (faces_deg is null or (faces_deg >= 0 and faces_deg < 360));
