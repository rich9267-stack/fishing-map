# Fishing Map

A shared map to help pick where to fish in Pompano Beach / Broward County today: saved spots alongside current tide, wind, and weather.

**Step 1:** phone-friendly page with today's tides at Hillsboro Inlet (NOAA station 8722859).

**Step 2:** wind and weather for Pompano Beach from the National Weather Service.

**Step 3:** shared spots list saved in a Supabase database. Database setup: run `setup/01-spots.sql` once in the Supabase SQL Editor.

**Step 4:** catch log per spot, saving tide stage, barometric pressure (and trend), wind, and air temp with each catch. Pressure comes from NWS observations at Pompano Beach Airpark (KPMP), with Fort Lauderdale (KFLL) as backup.

**Step 4b:** catches logged for any date/time auto-load that moment's tide stage (NOAA), pressure + trend, wind, temp (Open-Meteo records), moon phase and solunar period (SunCalc). Moon & solunar card for today.

**Step 4c (current):** edit and delete catches (delete is recoverable in Supabase).
