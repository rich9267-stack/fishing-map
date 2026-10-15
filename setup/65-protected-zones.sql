-- 65: no-fishing zones check (Gulf expansion step 8). Already applied (migration `protected_zones`, Oct 15 2026); data loaded by the database itself with pg_net.
-- A small shared table of the Florida "No Take" / "No Access" areas, read by every signed-in member (js/33-zones.js keeps a copy on the phone for a week).
create table if not exists public.protected_zones (
  id bigserial primary key,
  source_id text not null unique,          -- the inventory's Site_ID + "-" + row number, so a re-run does nothing twice
  name text not null,
  level text not null check (level in ('no_fishing','no_entry')),   -- no_fishing: commercial + recreational fishing prohibited · no_entry: closed to the public
  rule text,                               -- the inventory's own "Fishing Restrictions" words
  protection text,                         -- "No Take" / "No Access"
  agency text,
  url text,
  anchor text,
  vessel text,
  geom jsonb not null,                     -- GeoJSON Polygon / MultiPolygon, [lng, lat], simplified to about 11 m
  min_lat double precision not null,
  min_lng double precision not null,
  max_lat double precision not null,
  max_lng double precision not null,
  active boolean not null default true,    -- set false to switch a zone off without deleting it
  created_at timestamptz not null default now()
);
create index if not exists protected_zones_box on public.protected_zones (min_lat, max_lat);
alter table public.protected_zones enable row level security;
create policy "members read protected zones" on public.protected_zones for select using (public.is_member() and active);

-- DATA (loaded Oct 15 2026; 39 zones, 38 active):
-- 1) Ask the national Marine Protected Areas inventory (same server the map's 🚫 layer uses) for Florida's no-take / no-access areas:
--    select net.http_get(url := 'https://services1.arcgis.com/eGSDp8lpKe5izqVc/ArcGIS/rest/services/Marine_Protected_Areas__MPAIs_/FeatureServer/0/query'
--      || '?where=State%3D%27FL%27%20AND%20(Prot_Lvl%20IN%20(%27No%20Take%27%2C%27No%20Access%27)%20OR%20Fish_Rstr%3D%27Commercial%20and%20Recreational%20Fishing%20Prohibited%27)'
--      || '&outFields=Site_ID,Site_Name,Prot_Lvl,Fish_Rstr,Mgmt_Agen,Anchor,Vessel,URL&returnGeometry=true&outSR=4326&maxAllowableOffset=0.0001&f=geojson',
--      timeout_milliseconds := 90000);
-- 2) Turn the saved answer's features into rows: level = 'no_fishing' when Fish_Rstr = 'Commercial and Recreational Fishing Prohibited', else 'no_entry';
--    the box (min/max lat/lng) comes from the geometry's numbers; insert ... on conflict (source_id) do nothing.
-- 3) Checked against NOAA's own Florida Keys sanctuary zone layer (gis.ngdc.noaa.gov ... BenthicMapping_FKNMS_Dataviewer/MapServer/52 = 23 zones: 16 sanctuary
--    preservation areas, Western Sambo ecological reserve, 4 research-only areas, ...): every one of its 23 names is in the table.
-- 4) Switched off: "Tortugas Marine Reserves Habitat Areas of Particular Concern" (a gear designation, not a full closure; could not be confirmed):
--      update public.protected_zones set active = false where name like 'Tortugas Marine Reserves Habitat Areas%';
--
-- Not in the table (on purpose or not found): state parks and other refuges that only "restrict" fishing, aquatic preserves, seasonal closures,
-- Biscayne and Everglades National Park zones, local rules. The app says so wherever it shows a result.
-- Refreshing: the shapes rarely change; repeat steps 1-2 now and then (new rows only; to retire one, set active = false).
