-- 107: no-fishing zones for the rest of the continental US (US plan step 5 "Spots everywhere"). Same table and same phone code as Florida (setup/65, js/33).
-- Applied Oct 22 2026 (migration `national_protected_zones`); data loaded by the database itself with pg_net, like setup/65.
-- Florida's 39 rows are NOT touched (only their new `state` column is filled in).

-- 1) Which state a zone belongs to (so the card can name the right agency; Florida keeps its FWC wording)
alter table public.protected_zones add column if not exists state text;
update public.protected_zones set state = 'FL' where state is null;

-- 2) Ask NOAA's national Marine Protected Areas inventory (2023 edition) for the no-take / no-access areas of every continental state that has any
--    (CA CT GA IL MA MD ME MI MN MS NC NY OH OR RI SC TX VA WA; Alaska, Hawaii and the territories are outside the app's map; Florida already loaded):
--    select net.http_get(url := 'https://services2.arcgis.com/C8EMgrsFcRFL6LrL/arcgis/rest/services/NOAA_MPA_Inventory_2023/FeatureServer/0/query'
--      || '?where=State%20IN%20(%27CA%27,%27CT%27,%27GA%27,%27IL%27,%27MA%27,%27MD%27,%27ME%27,%27MI%27,%27MN%27,%27MS%27,%27NC%27,%27NY%27,%27OH%27,%27OR%27,%27RI%27,%27SC%27,%27TX%27,%27VA%27,%27WA%27)%20AND%20(Prot_Lvl%20IN%20(%27No%20Take%27%2C%27No%20Access%27)%20OR%20Fish_Rstr%3D%27Commercial%20and%20Recreational%20Fishing%20Prohibited%27)'
--      || '&outFields=Site_ID,Site_Name,State,Prot_Lvl,Fish_Rstr,Mgmt_Agen,Anchor,Vessel,URL&returnGeometry=true&outSR=4326&geometryPrecision=6&orderByFields=FID&f=geojson',
--      timeout_milliseconds := 90000);
--    (162 areas, 3.2 MB. This server ignores "maxAllowableOffset", so step 3 simplifies the shapes itself to about 11 m, the same detail as Florida's.)

-- 3) Turn the saved answer into rows (replace 4026 with the id step 2 returned). Shape simplifier = Douglas-Peucker, a temporary function (gone after the session).
create or replace function pg_temp.zn_ring(r jsonb, tol float8) returns jsonb language plpgsql as $$
declare
  n int := jsonb_array_length(r); xs float8[]; ys float8[]; keep boolean[]; sa int[]; sb int[]; a int; b int; i int; mi int;
  md float8; d float8; dx float8; dy float8; l float8; u float8; out jsonb := '[]'::jsonb; k int := 0;
begin
  select array_agg((p->>0)::float8 order by o), array_agg((p->>1)::float8 order by o) into xs, ys from jsonb_array_elements(r) with ordinality as e(p, o);
  keep := array_fill(false, array[n]); keep[1] := true; keep[n] := true;
  sa := array[1]; sb := array[n];
  while coalesce(array_length(sa, 1), 0) > 0 loop
    a := sa[array_length(sa, 1)]; b := sb[array_length(sb, 1)];
    sa := sa[1:array_length(sa, 1) - 1]; sb := sb[1:array_length(sb, 1) - 1];
    md := 0; mi := 0; dx := xs[b] - xs[a]; dy := ys[b] - ys[a]; l := dx * dx + dy * dy;
    for i in a + 1 .. b - 1 loop
      u := case when l > 0 then greatest(0, least(1, ((xs[i] - xs[a]) * dx + (ys[i] - ys[a]) * dy) / l)) else 0 end;
      d := sqrt(power(xs[i] - xs[a] - u * dx, 2) + power(ys[i] - ys[a] - u * dy, 2));
      if d > md then md := d; mi := i; end if;
    end loop;
    if md > tol then keep[mi] := true; sa := sa || array[a, mi]; sb := sb || array[mi, b]; end if;
  end loop;
  for i in 1 .. n loop
    if keep[i] then out := out || jsonb_build_array(jsonb_build_array(round(xs[i]::numeric, 5), round(ys[i]::numeric, 5))); k := k + 1; end if;
  end loop;
  if k < 4 then   -- a tiny shape: keep every corner rather than lose it
    select jsonb_agg(jsonb_build_array(round((p->>0)::numeric, 5), round((p->>1)::numeric, 5)) order by o) into out from jsonb_array_elements(r) with ordinality as e(p, o);
  end if;
  return out;
end $$;
create or replace function pg_temp.zn_poly(p jsonb) returns jsonb language sql as $$
  select jsonb_agg(pg_temp.zn_ring(r, 0.0001) order by o) from jsonb_array_elements(p) with ordinality as e(r, o) where jsonb_array_length(r) >= 4
$$;

with resp as (select content::jsonb as j from net._http_response where id = 4026 and status_code = 200),
f as (select e.f, e.o from resp, jsonb_array_elements(resp.j->'features') with ordinality as e(f, o) where e.f->'geometry' is not null),
g as (
  select f.o, f.f->'properties' as p,
    case when f.f->'geometry'->>'type' = 'Polygon'
      then jsonb_build_object('type', 'Polygon', 'coordinates', pg_temp.zn_poly(f.f->'geometry'->'coordinates'))
      else jsonb_build_object('type', 'MultiPolygon', 'coordinates', (select jsonb_agg(pg_temp.zn_poly(x) order by xo) from jsonb_array_elements(f.f->'geometry'->'coordinates') with ordinality as m(x, xo)))
    end as geom
  from f
),
b as (   -- the box comes from the outside edge of every part
  select g.*, (select min((pt->>1)::float8) from jsonb_array_elements(case when geom->>'type' = 'Polygon' then jsonb_build_array(geom->'coordinates') else geom->'coordinates' end) pp, jsonb_array_elements(pp->0) pt) as min_lat,
    (select min((pt->>0)::float8) from jsonb_array_elements(case when geom->>'type' = 'Polygon' then jsonb_build_array(geom->'coordinates') else geom->'coordinates' end) pp, jsonb_array_elements(pp->0) pt) as min_lng,
    (select max((pt->>1)::float8) from jsonb_array_elements(case when geom->>'type' = 'Polygon' then jsonb_build_array(geom->'coordinates') else geom->'coordinates' end) pp, jsonb_array_elements(pp->0) pt) as max_lat,
    (select max((pt->>0)::float8) from jsonb_array_elements(case when geom->>'type' = 'Polygon' then jsonb_build_array(geom->'coordinates') else geom->'coordinates' end) pp, jsonb_array_elements(pp->0) pt) as max_lng
  from g
)
insert into public.protected_zones (source_id, name, level, rule, protection, agency, url, anchor, vessel, geom, min_lat, min_lng, max_lat, max_lng, state)
select 'us23-' || (p->>'Site_ID') || '-' || o, p->>'Site_Name',
  -- same rule as Florida: "fishing prohibited" (or no-take) = no_fishing, otherwise a no-access area = no_entry
  case when p->>'Fish_Rstr' in ('Commercial and Recreational Fishing Prohibited', 'Recreational Fishing Prohibited') or p->>'Prot_Lvl' = 'No Take' then 'no_fishing' else 'no_entry' end,
  p->>'Fish_Rstr', p->>'Prot_Lvl', p->>'Mgmt_Agen', nullif(p->>'URL', ''), p->>'Anchor', p->>'Vessel', geom, min_lat, min_lng, max_lat, max_lng, p->>'State'
from b
-- left out: "No Take" areas whose own record says some fishing is still allowed (Cape Charles VA, Cross Island ME, Anacapa Island federal area CA,
-- James V Fitzgerald CA) — calling them "fishing is not allowed" would be wrong.
where not (p->>'Prot_Lvl' = 'No Take' and p->>'Fish_Rstr' in ('Commercial Fishing Prohibited', 'Commercial Fishing Restricted', 'Commercial and Recreational Fishing Restricted'))
on conflict (source_id) do nothing;

-- 4) The national file has single spaces where it has no anchoring / boat words: store nothing instead (migration `national_zones_blank_words`; new rows only)
update public.protected_zones set anchor = nullif(trim(anchor), ''), vessel = nullif(trim(vessel), ''), url = nullif(trim(url), '') where state <> 'FL' and source_id like 'us23-%';

-- RESULT (Oct 22 2026): 158 new zones (CA 97, WA 14, OR 7, VA 5, OH 5, GA 4, ME 4, MN 4, IL 2, MA 2, MD 2, MS 2, NY 2, NC 3, CT 1, MI 1, RI 1, SC 1, TX 1);
-- 197 in all, 196 active, table 584 kB. Florida's 39 rows unchanged (shapes byte-for-byte the same). Details in docs/build_history.md v169. Members still only READ the table (policy from setup/65); no new function, no grants.
-- Refreshing: repeat steps 2-3 now and then (new rows only; to retire one, set active = false).
