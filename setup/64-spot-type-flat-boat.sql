-- 64: two new spot types for the Gulf + Keys expansion, step 7 (shore vs boat scoring, Oct 15 2026):
--   'flat' (shallow sand / grass flat) and 'boat' (reef, wreck, channel — reached by boat).
-- Same pattern as 53: add the wider rule first, check the old rows against it, then remove the old rule.
alter table public.spots add constraint spots_spot_type_check3 check (spot_type = any (array['dock','bridge','inlet','pier','jetty','seawall','ramp','shore','flat','boat']::text[])) not valid;
alter table public.spots validate constraint spots_spot_type_check3;
alter table public.spots drop constraint spots_spot_type_check2;
