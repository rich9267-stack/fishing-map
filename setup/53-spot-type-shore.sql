-- 53: new spot type "shore" (lake / canal bank) for 🏞 public fishing water from FWC (Oct 14, Fishbrain audit item 11).
-- Applied as two migrations: add the new rule first, then remove the old one (the connector allowed this drop).
alter table public.spots add constraint spots_spot_type_check2 check (spot_type = any (array['dock','bridge','inlet','pier','jetty','seawall','ramp','shore']::text[])) not valid;
alter table public.spots validate constraint spots_spot_type_check2;
alter table public.spots drop constraint spots_spot_type_check;
