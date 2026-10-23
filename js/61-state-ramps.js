// ---- ✅ Official boat-ramp lists from state agencies (US plan: "nationwide official ramp lists") ----
// Florida has its own lists (FWC ramps, FL DEP parks/piers in the official_spots table, js/02) and is left exactly as it was.
// For every other state whose wildlife / natural-resources agency publishes a boat-ramp list on a free public map server (ArcGIS), the
// ✅ Official public spots layer (js/37) asks that agency's server for the ramps in the part of the map ON SCREEN. Nothing goes into our database.
// Only places the agency's own list shows as public and open are kept (each state's `keep` below: not private, not closed, not a marina).
// States without a free list we could use (Pennsylvania's server is down, Illinois, Colorado, Kansas, Oklahoma, the Dakotas, Mississippi, Arizona,
// Nevada, Wyoming, California, DC) keep the OpenStreetMap ramps from js/58. Where both know the same ramp (within ~200 yards) the agency's wins.
// Each answer is kept on this phone for a week (the last STR.keep views), so panning back or going offline still shows them.
// The tap card says which agency the place comes from (credit). js/37 calls outsideLoad / outsideItems / outsideNote below.
const stT = s => { s = String(s == null ? "" : s).replace(/\s+/g, " ").trim(); return s && s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s(\-\/.])([a-z])/g, (m, a, b) => a + b.toUpperCase()) : s; };
const stYes = v => /^y/i.test(String(v == null ? "" : v).trim());
const stLanes = v => { const n = parseInt(v, 10); return n > 0 ? n : undefined; };
const STR_PRIVATE = /private|llc|\binc\b|corp|club|association|resort|marina|renewable|campground/i;

// url = the layer; f = the fields we ask for; name(a) → text (or "" = skip); keep(a) → true when the agency lists it as public and open;
// hand(a) → true for a car-top / carry-in launch (shown as "Hand launch"); info(a) → { lanes, fee, hours, water, owner, county } for the tap card.
const STATE_RAMPS = {
  NC: { credit: "North Carolina Wildlife Resources Commission boating access areas",
    url: "https://services1.arcgis.com/YfqBAUM5nWR3yhGP/arcgis/rest/services/NCWRC_Boating_Access_Areas_view/FeatureServer/0",
    f: "BAA_Name,Site_Status,Water_Access,County,Owner,Launch_Lane_No",
    name: a => stT(a.BAA_Name), keep: a => String(a.Site_Status).toUpperCase() === "OPEN",
    info: a => ({ lanes: stLanes(a.Launch_Lane_No), water: stT(a.Water_Access), owner: stT(a.Owner) }), county: a => stT(a.County) },
  ME: { credit: "Maine GeoLibrary boat launches (Maine state list)",
    url: "https://services1.arcgis.com/RbMX0mRVOFNTdLzd/ArcGIS/rest/services/Maine_GeoLibrary_Structure/FeatureServer/1",
    f: "WATER_BODY,MCD,COUNTY,OWNSHIP,TYPE,TYPERAMP",
    name: a => a.WATER_BODY ? stT(a.WATER_BODY) + " boat launch" + (a.MCD ? " (" + stT(a.MCD) + ")" : "") : "",
    keep: a => !STR_PRIVATE.test(a.OWNSHIP || ""), hand: a => a.TYPE === "CI",
    info: a => ({ water: stT(a.WATER_BODY), owner: stT(a.OWNSHIP) }), county: a => stT(a.COUNTY) },
  MA: { credit: "Massachusetts Office of Fishing & Boating Access",
    url: "https://services1.arcgis.com/hGdibHYSPO59RG1h/arcgis/rest/services/Office_of_Fishing_and_Boating_Access_Sites/FeatureServer/0",
    f: "FACNAME,TOWN,RAMPTYPE,NOLANES,FEE,RESTRICTED,PENDING,MAINTRESP",
    name: a => stT(a.FACNAME), keep: a => !stYes(a.RESTRICTED) && !stYes(a.PENDING), hand: a => /cartop/i.test(a.RAMPTYPE || ""),
    info: a => ({ lanes: stLanes(a.NOLANES), fee: stYes(a.FEE) || /annual/i.test(a.FEE || "") ? "Yes" : "No", owner: stT(a.MAINTRESP) }) },
  CT: { credit: "Connecticut DEEP state boat launches",
    url: "https://services1.arcgis.com/FjPcSmEFuDYlIdKC/arcgis/rest/services/DEEP_State_Trailered_Boat_Launches/FeatureServer/0",
    f: "ACCSS_NAME,STATUS,WATERBODY,AGNCY_NAME,ACCSS_TOWN",
    name: a => stT(a.ACCSS_NAME), keep: a => /^open/i.test(a.STATUS || ""),
    info: a => ({ water: stT(a.WATERBODY), owner: stT(a.AGNCY_NAME) }) },
  RI: { credit: "Rhode Island DEM fishing & boating access list",
    url: "https://services2.arcgis.com/S8zZg9pg23JUEexQ/arcgis/rest/services/HYDRO_Fishing_Boating_Access_2024_spf/FeatureServer/0",
    f: "NAME,TYPE,RSTRCTN,Wat_Ttp",
    name: a => stT(a.NAME), keep: a => /ramp|launch/i.test(a.TYPE || "") && !/clos|no public|private/i.test(a.RSTRCTN || ""), hand: a => /smallcraft/i.test(a.TYPE || ""),
    info: a => ({ water: /salt/i.test(a.Wat_Ttp || "") ? "Salt water" : "Fresh water" }) },
  NH: { credit: "New Hampshire Fish & Game / DES public water access sites",
    url: "https://services8.arcgis.com/hg1B9Egwk1I5p300/arcgis/rest/services/nh_access_sites/FeatureServer/0",
    f: "FACILITY,WATER_BODY,TOWN,COUNTY,OWNERSHIP,FGTYPE,BOAT,FEE",
    name: a => stT(a.FACILITY || a.WATER_BODY), keep: a => stYes(a.BOAT) && /^(RAMP|CARTOP)$/i.test(a.FGTYPE || "") && !/private|unknown/i.test(a.OWNERSHIP || ""),
    hand: a => /cartop/i.test(a.FGTYPE || ""), info: a => ({ water: stT(a.WATER_BODY), fee: a.FEE, owner: stT(a.OWNERSHIP) }), county: a => stT(a.COUNTY) },
  VT: { credit: "Vermont Agency of Natural Resources fishing access areas",
    url: "https://anrmaps.vermont.gov/arcgis/rest/services/Open_Data/OPENDATA_ANR_TOURISM_SP_NOCACHE_v2/MapServer/163",
    f: "AccessName,WaterBody,Town,County,Owner,AccessType,RampType",
    name: a => stT(a.AccessName || a.WaterBody), keep: a => /boat/i.test(a.AccessType || ""), hand: a => /hand|carry|cartop|none/i.test(a.RampType || ""),
    info: a => ({ water: stT(a.WaterBody), owner: stT(a.Owner) }), county: a => stT(a.County) },
  NY: { credit: "New York State DEC boat launch sites",
    url: "https://services6.arcgis.com/DZHaqZm9cxOD4CWM/arcgis/rest/services/Boat_Launch_Sites/FeatureServer/4",
    f: "WATERBODY,COUNTY,ACCESS_TYP,AGENCY",
    name: a => a.WATERBODY ? stT(a.WATERBODY) + " boat launch" : "", keep: a => !STR_PRIVATE.test(a.AGENCY || ""), hand: a => /^hand/i.test(a.ACCESS_TYP || ""),
    info: a => ({ water: stT(a.WATERBODY), owner: stT(a.AGENCY) }), county: a => stT(a.COUNTY) },
  NJ: { credit: "New Jersey DEP public access to tidal waterways",
    url: "https://mapsdep.nj.gov/arcgis/rest/services/Features/Environmental_admin/MapServer/7",
    f: "STREET,MUN_LABEL,COUNTY_LAB,BOATLNCH,MARINA",
    name: a => a.STREET ? stT(a.STREET) + " boat launch" + (a.MUN_LABEL ? " (" + stT(a.MUN_LABEL) + ")" : "") : "", keep: a => stYes(a.BOATLNCH) && !stYes(a.MARINA),
    info: () => ({}), county: a => stT(a.COUNTY_LAB) },
  DE: { credit: "Delaware DNREC fishing access areas",
    url: "https://enterprise.firstmap.delaware.gov/arcgis/rest/services/Society/DE_Fishing_Access/FeatureServer/0",
    f: "GNIS_NAME,TIDAL_FISHING_ACCESS_AREAS,COUNTY,FACILITY,PUBLICACCESS,DIVISION",
    name: a => stT(a.GNIS_NAME || a.TIDAL_FISHING_ACCESS_AREAS), keep: a => stYes(a.PUBLICACCESS) && /boat ramp|canoe launch|fishing pier/i.test(a.FACILITY || ""),
    kind: a => (/pier/i.test(a.FACILITY || "") ? "pier" : "ramp"), hand: a => /canoe/i.test(a.FACILITY || ""),
    info: a => ({ owner: stT(a.DIVISION) }), county: a => stT(a.COUNTY) },
  MD: { credit: "Maryland DNR water access sites",
    url: "https://services.arcgis.com/njFNhDsUCentVYJW/arcgis/rest/services/Maryland_Water_Access_Sites_Production_View/FeatureServer/0",
    f: "SiteName,County,WaterBody,OwnerManager,BoatRamp,RampLanes,FeePermitReq,Hours",
    name: a => stT(a.SiteName), keep: a => stYes(a.BoatRamp),
    info: a => ({ lanes: stLanes(a.RampLanes), fee: stYes(a.FeePermitReq) ? "Yes" : "No", hours: a.Hours ? String(a.Hours).trim() : undefined, water: stT(a.WaterBody), owner: stT(a.OwnerManager) }), county: a => stT(a.County) },
  VA: { credit: "Virginia Dept. of Wildlife Resources boating access sites",
    url: "https://services.dwr.virginia.gov/arcgis/rest/services/HUB_Layers/DWR_Boating_Access_Locations/FeatureServer/0",
    f: "SITENAME,WATERBODY,COUNTY,TYPE,On_List,Owner",
    name: a => stT(a.SITENAME), keep: a => stYes(a.On_List), hand: a => /^(HC|BS|CR-HC|BS\/HC)$/.test(a.TYPE || ""),
    info: a => ({ water: stT(a.WATERBODY), owner: /no file/i.test(a.Owner || "") ? undefined : stT(a.Owner) }), county: a => stT(a.COUNTY) },
  WV: { credit: "West Virginia DNR public fishing & boating access sites",
    url: "https://services9.arcgis.com/SQbkdxLkuQJuLGtx/arcgis/rest/services/PublicFishingAccess/FeatureServer/0",
    f: "SiteName,County,AccessType,Ownership,Waterbody",
    name: a => stT(a.SiteName), keep: a => /^(ramp|winter ramp|carry down|slide down)$/i.test(a.AccessType || "") && !/private/i.test(a.Ownership || ""),
    hand: a => /carry|slide/i.test(a.AccessType || ""), info: a => ({ water: stT(a.Waterbody), owner: stT(a.Ownership) }), county: a => stT(a.County) },
  SC: { credit: "South Carolina DNR public boat ramps",
    url: "https://services3.arcgis.com/kTHh5mF5pghzqQ3m/arcgis/rest/services/Public_Boat_Ramps_Clipped_(SC_DNR)/FeatureServer/0",
    f: "Boat_Ramp_Name,County,Body_of_Water",
    name: a => stT(a.Boat_Ramp_Name), keep: () => true, info: a => ({ water: stT(a.Body_of_Water) }), county: a => stT(a.County) },
  GA: { credit: "Georgia DNR Wildlife Resources water access points",
    url: "https://services6.arcgis.com/9QlSLDqa0P1cHLhu/arcgis/rest/services/WRD_Water_Access_Points/FeatureServer/0",
    f: "Name,Waterbody,County,Draw,Status,Ramp,NumLanes,Fee,Owner",
    name: a => stT(a.Name), keep: a => /^public$/i.test(a.Draw || "") && /^open$/i.test(a.Status || "") && stYes(a.Ramp) && !/private/i.test(a.Owner || ""),
    info: a => ({ lanes: stLanes(a.NumLanes), fee: a.Fee, water: stT(a.Waterbody), owner: /unknown/i.test(a.Owner || "") ? undefined : stT(a.Owner) }), county: a => stT(a.County) },
  AL: { credit: "Alabama DCNR coastal boat ramps",
    url: "https://services7.arcgis.com/jcVUvxpWnajErgCr/arcgis/rest/services/Coastal_AL_Boat_Ramps/FeatureServer/0",
    f: "Name", name: a => stT(a.Name), keep: () => true, info: () => ({}) },
  TN: { credit: "Tennessee Wildlife Resources Agency boat launch sites",
    url: "https://services3.arcgis.com/PWXNAH2YKmZY7lBq/arcgis/rest/services/Boat_Launch_Sites/FeatureServer/0",
    f: "Name,Waterway,County,Owner,Ramps",
    name: a => stT(a.Name), keep: a => !/private/i.test(a.Owner || "") && Number(a.Ramps) !== 0,
    info: a => ({ lanes: stLanes(a.Ramps), water: stT(a.Waterway), owner: stT(a.Owner) }), county: a => stT(a.County) },
  KY: { credit: "Kentucky Dept. of Fish & Wildlife access sites",
    url: "https://services3.arcgis.com/ghsX9CKghMvyYjBU/arcgis/rest/services/Ky_KDFWR_Fishing_Access_Sites_WM_gdb/FeatureServer/0",
    f: "SiteName,NAME,WaterBody,AccessType,Boat_Ramp,Lanes,Fee,display",
    name: a => stT(a.SiteName || a.NAME), keep: a => /^(any boat|small boat only|carrydown only)$/i.test(a.AccessType || "") && !/^(none|unknown)$/i.test(a.Boat_Ramp || "") && a.display !== 0,
    hand: a => /carrydown/i.test(a.AccessType || ""), info: a => ({ lanes: stLanes(a.Lanes), fee: a.Fee, water: stT(a.WaterBody) }) },
  OH: { credit: "Ohio DNR boater access list (Facility Guide)",
    url: "https://services5.arcgis.com/ajRlmtxbNBjZggOT/arcgis/rest/services/Facility_Guide_And_Stream_Access/FeatureServer/0",
    f: "SiteName,Facility_Type,Status,Public_,AdminType,HandLaunchOnly,UserFee,Waterbody,County,OpHours",
    name: a => stT(a.SiteName), keep: a => /^(boat launch|dock and launch)$/i.test(a.Facility_Type || "") && /^active$/i.test(a.Status || "") && stYes(a.Public_) && !/commercial|club|institutional/i.test(a.AdminType || ""),
    hand: a => stYes(a.HandLaunchOnly), info: a => ({ fee: a.UserFee, hours: a.OpHours ? String(a.OpHours).trim() : undefined, water: stT(a.Waterbody) }), county: a => stT(a.County) },
  MI: { credit: "Michigan DNR boating access sites",
    url: "https://services3.arcgis.com/Jdnp1TjADvSDxMAX/arcgis/rest/services/DNR_State_Sponsored_Developed_Boating_Access_Sites_Public_View/FeatureServer/0",
    f: "name,LABELNAME,waterbody,BAS_Type,OWNEDBY,nLanes,CarryDown,County",
    name: a => stT(a.name || a.LABELNAME || a.waterbody), keep: a => !!a.BAS_Type && !/private/i.test(a.OWNEDBY || ""),
    hand: a => !(Number(a.nLanes) > 0) && !!a.CarryDown && !/^(no|0)$/i.test(String(a.CarryDown)),
    info: a => ({ lanes: stLanes(a.nLanes), water: stT(a.waterbody) }), county: a => stT(a.County) },
  IN: { credit: "Indiana DNR fishing access sites",
    url: "https://gisdata.in.gov/server/rest/services/Hosted/Fish_Access_RO/FeatureServer/0",
    f: "site_name,waterbody,county,boat_ramp,land_type,fee",
    name: a => stT(a.site_name), keep: a => stYes(a.boat_ramp) && /public/i.test(a.land_type || ""),
    info: a => ({ water: stT(a.waterbody), fee: a.fee }), county: a => stT(a.county) },
  WI: { credit: "Wisconsin DNR public boat access sites",
    url: "https://dnrmaps.wi.gov/arcgis2/rest/services/PR_Recreation/PR_Boat_Access_Shore_Fishing_WTM_Ext/MapServer/2",
    f: "LMS_BOAT_LANDING_NAME,LANDING_TYPE_CODE,ABANDON_FLAG,OWNERSHIP_NAME_TEXT,WATERBODY_NAME_TEXT,COUNTY_NAME_TEXT",
    name: a => stT(a.LMS_BOAT_LANDING_NAME), keep: a => !stYes(a.ABANDON_FLAG) && !/^other$/i.test(a.OWNERSHIP_NAME_TEXT || ""), hand: a => /carry/i.test(a.LANDING_TYPE_CODE || ""),
    info: a => ({ water: stT(a.WATERBODY_NAME_TEXT), owner: stT(a.OWNERSHIP_NAME_TEXT) }), county: a => stT(a.COUNTY_NAME_TEXT) },
  MN: { credit: "Minnesota DNR public water access sites",
    url: "https://enterprise.gisdata.mn.gov/aghost/rest/services/us_mn_state_dnr/struc_water_access_sites/FeatureServer/0",
    f: "access_name,launch_type,administrator,county_name,lake_name,number_of_ramps",
    name: a => stT(a.access_name), keep: () => true, hand: a => /carry/i.test(a.launch_type || ""),
    info: a => ({ lanes: stLanes(a.number_of_ramps), water: stT(a.lake_name), owner: stT(a.administrator) }), county: a => stT(a.county_name) },
  IA: { credit: "Iowa DNR boat ramps",
    url: "https://services2.arcgis.com/r6iFVcMJeA4kB4GC/arcgis/rest/services/BoatRamps/FeatureServer/0",
    f: "Name,Source", name: a => stT(a.Name), keep: a => /water access|water trails/i.test(a.Source || ""), info: () => ({}) },
  MO: { credit: "Missouri Dept. of Conservation boat ramps",
    url: "https://services2.arcgis.com/kNS2ppBA4rwAQQZy/arcgis/rest/services/MO_Missouri_Department_of_Conservation_Boat_Ramps/FeatureServer/0",
    f: "Area_Name", name: a => stT(a.Area_Name), keep: () => true, info: () => ({}) },
  AR: { credit: "Arkansas Game & Fish Commission boat & kayak access",
    url: "https://services.arcgis.com/5bMc8SlGDYGINZr5/arcgis/rest/services/boatAndKayakAccess/FeatureServer/14",
    f: "flabel,ftype,fdescrip,waterbody", name: a => stT(a.flabel), keep: () => true, hand: a => /kayak|canoe/i.test(a.ftype || ""),
    info: a => ({ water: stT(a.waterbody) }) },
  LA: { credit: "Louisiana Dept. of Wildlife & Fisheries boat launches",
    url: "https://services1.arcgis.com/fXHQyq63u0UsTeSM/arcgis/rest/services/LDWF_Boat_Launches/FeatureServer/0",
    f: "Boat_Launc,Waterbody,Access,Hours",
    name: a => stT(a.Boat_Launc), keep: a => /^public/i.test(a.Access || ""),
    info: a => ({ fee: /pay|fee/i.test(a.Access || "") ? "Yes" : undefined, hours: a.Hours ? String(a.Hours).trim() : undefined, water: stT(a.Waterbody) }) },
  TX: { credit: "Texas Parks & Wildlife public boat ramps",
    url: "https://services1.arcgis.com/1mtXwieMId59thmg/arcgis/rest/services/BoatRamps_Public/FeatureServer/0",
    f: "AccessType,AccessTypeDescription",
    name: a => a.AccessTypeDescription ? stT(a.AccessTypeDescription) + " public boat ramp" : "", keep: () => true, info: a => ({ water: stT(a.AccessTypeDescription) }) },
  NM: { credit: "New Mexico Dept. of Game & Fish boat ramps",
    url: "https://services2.arcgis.com/CjbW1bVhK4dB3WOa/arcgis/rest/services/Boat_Ramps/FeatureServer/1",
    f: "Water_name,Ownership", name: a => a.Water_name ? stT(a.Water_name) + " boat ramp" : "", keep: () => true, info: a => ({ water: stT(a.Water_name), owner: stT(a.Ownership) }) },
  NE: { credit: "Nebraska Game & Parks Commission boat ramps",
    url: "https://services5.arcgis.com/IOshH1zLrIieqrNk/arcgis/rest/services/Boat_Ramps_View_Layer_for_Public_Web_Map/FeatureServer/3",
    f: "rAreaName,WaterbodyName,County,AccessType,Ramp_Status,rNumLanes,RampOwner",
    name: a => stT(a.rAreaName || a.WaterbodyName), keep: a => /^public$/i.test(a.AccessType || "") && /^open$/i.test(a.Ramp_Status || ""),
    info: a => ({ lanes: stLanes(a.rNumLanes), water: stT(a.WaterbodyName), owner: stT(a.RampOwner) }), county: a => stT(a.County) },
  MT: { credit: "Montana Fish, Wildlife & Parks fishing access sites",
    url: "https://services3.arcgis.com/Cdxz8r11hT0MGzg1/arcgis/rest/services/FWPLND_FAS_POINTS/FeatureServer/0",
    f: "NAME,BOAT_FAC", name: a => stT(a.NAME), keep: a => !!a.BOAT_FAC && !/^no boat/i.test(a.BOAT_FAC), hand: a => /^(hand|raft)/i.test(a.BOAT_FAC || ""), info: () => ({}) },
  ID: { credit: "Idaho Fish & Game fishing & boating access sites",
    url: "https://gisportal-idfg.idaho.gov/hosting/rest/services/Access/IDFG_Fishing_and_Boating_Access_Sites_Public/FeatureServer/0",
    f: "site_name,county,status,ramp", name: a => stT(a.site_name), keep: a => /^active$/i.test(a.status || "") && (stYes(a.ramp) || /non-?motor/i.test(a.ramp || "")),
    hand: a => /non-?motor/i.test(a.ramp || ""), info: () => ({}), county: a => stT(a.county) },
  UT: { credit: "Utah AGRC boat ramps (state list)",
    url: "https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/BoatRamps/FeatureServer/0",
    f: "Name,Water_body,OWNER,AGENCY,Vessels",
    name: a => stT(a.Name), keep: a => !/private/i.test((a.OWNER || "") + " " + (a.AGENCY || "")), hand: a => /float/i.test(a.Vessels || ""),
    info: a => ({ water: stT(a.Water_body), owner: a.AGENCY }) },
  WA: { credit: "Washington Dept. of Fish & Wildlife boat ramps",
    url: "https://geodataservices.wdfw.wa.gov/arcgis/rest/services/ApplicationServices/Facilities/MapServer/5",
    f: "BoatRampName", name: a => stT(a.BoatRampName), keep: () => true, info: () => ({}) },
  OR: { credit: "Oregon State Marine Board boating access sites",
    url: "https://services.arcgis.com/uUvqNMGPm7axC2dD/arcgis/rest/services/Boating_Access_Sites_OA/FeatureServer/0",
    f: "name,public_display,facility_type,launch_type,oa_status,manager,waterway_name,county",
    name: a => stT(a.name), keep: a => stYes(a.public_display) && /^boat ramp$/i.test(a.facility_type || "") && !/closed|restricted/i.test(a.oa_status || "") && !/private/i.test(a.manager || ""),
    hand: a => /hand carry|slide/i.test(a.launch_type || ""), info: a => ({ water: stT(a.waterway_name), owner: stT(a.manager) }), county: a => stT(a.county) }
};

const STR = { key: "fm-st-ramps-v1", age: 7 * 86400000, keep: 12, maxDeg: 1.2, pad: 0.1, boxes: [], read: false, loading: {}, failAt: {}, note: "", snap: {}, snapLoading: {} };

// Fast path: data/ramps/<ST>.json = that agency's whole public + open list, saved in the app's own files by tools/make-ramp-snapshots.js (same rules as below).
// One small file per state, kept on the phone by sw.js. If it can't be read (not published yet, offline first time) the live agency server below is asked as before.
function stFromSnap(st, r) {
  const c = STATE_RAMPS[st];
  return { id: null, key: "st/" + st + "/" + r.la.toFixed(5) + "," + r.ln.toFixed(5), source: "state-ramp", trust: "official", credit: c.credit, name: r.n, kind: r.k || "ramp",
    lat: r.la, lng: r.ln, state: st, county: r.c || null, water_type: null, details: r.d || {} };
}
function stSnapLoad(st) {
  if (STR.snap[st] !== undefined) return Promise.resolve(false);
  if (STR.snapLoading[st]) return STR.snapLoading[st];
  STR.snapLoading[st] = (async () => {
    try {
      const res = await fetch("data/ramps/" + st + ".json");
      if (!res.ok) throw new Error("http " + res.status);
      const j = await res.json();
      if (!j || !Array.isArray(j.items)) throw new Error("bad file");
      const seen = new Set();
      STR.snap[st] = j.items.filter(r => r && r.n && isFinite(r.la) && isFinite(r.ln)).map(r => stFromSnap(st, r)).filter(p => !seen.has(p.key) && seen.add(p.key));
      return true;
    } catch (err) { STR.snap[st] = false; return false; }   // false = use the live server for this state
    finally { delete STR.snapLoading[st]; }
  })();
  return STR.snapLoading[st];
}
function stRead() {
  STR.read = true;
  try { const j = JSON.parse(localStorage.getItem(STR.key) || "null"); if (j && Array.isArray(j.boxes)) STR.boxes = j.boxes.filter(b => b && STATE_RAMPS[b.st] && Array.isArray(b.items) && isFinite(b.t)); } catch (e) { /* no copy yet */ }
}
function stSave() { try { localStorage.setItem(STR.key, JSON.stringify({ boxes: STR.boxes })); } catch (e) { /* storage full: asked again next time */ } }
const stHas = (b, s, w, n, e) => b.s <= s && b.w <= w && b.n >= n && b.e >= e;

// Which states with an agency list are in this view (checks a 5 × 5 grid of points across it)? Florida never is.
function stStatesIn(s, w, n, e) {
  const out = new Set();
  if (typeof stateOf !== "function") return [];
  for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
    const st = stateOf(s + (n - s) * i / 4, w + (e - w) * j / 4);
    if (st && STATE_RAMPS[st]) out.add(st);
  }
  return Array.from(out);
}

// One answer row from an agency server → a place shaped like an official spot, or null (not public/open, no name, or in Florida)
function stPlace(st, feat) {
  const c = STATE_RAMPS[st], a = feat.attributes || {}, g = feat.geometry || {};
  const lat = +g.y, lng = +g.x;
  if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) < 1 || Math.abs(lng) < 1) return null;
  let name, keep;
  try { name = c.name(a); keep = c.keep(a); } catch (e) { return null; }
  if (!name || !keep) return null;
  if (typeof stateOf === "function" && stateOf(lat, lng) === "FL") return null;   // Florida keeps its own lists only
  const info = c.info ? c.info(a) : {}, details = {};
  Object.keys(info).forEach(k => { if (info[k] !== undefined && info[k] !== null && info[k] !== "") details[k] = info[k]; });
  if (c.hand && c.hand(a)) details.type = "Hand launch";
  return { id: null, key: "st/" + st + "/" + lat.toFixed(5) + "," + lng.toFixed(5), source: "state-ramp", trust: "official", credit: c.credit, name, kind: (c.kind && c.kind(a)) || "ramp",
    lat, lng, state: st, county: c.county ? (c.county(a) || "").replace(/\s+county$/i, "") || null : null, water_type: null, details };
}

// Load the ramps for the view (a Leaflet LatLngBounds). Resolves true when new places arrived.
function stLoad(bounds) {
  if (!STR.read) stRead();
  const s = bounds.getSouth(), w = bounds.getWest(), n = bounds.getNorth(), e = bounds.getEast();
  STR.note = "";
  const states = stStatesIn(s, w, n, e);
  if (!states.length) return Promise.resolve(false);
  if (n - s > STR.maxDeg || e - w > STR.maxDeg) return Promise.resolve(false);   // (js/58 already says "zoom in a little")
  // 1) the saved list for each state (fast); 2) a state whose saved list can not be read goes to its live agency server
  return Promise.all(states.map(st => stSnapLoad(st))).then(f => {
    const live = states.filter(st => STR.snap[st] === false).map(st => stLive(st, s, w, n, e));
    return Promise.all(live).then(a => f.concat(a).some(Boolean));
  });
}
// One state's live agency server, for the view (a box rounded to 0.05° with a 0.1° margin). Resolves true when new places arrived.
function stLive(st, s, w, n, e) {
  if (STR.boxes.some(b => b.st === st && Date.now() - b.t < STR.age && stHas(b, s, w, n, e))) return Promise.resolve(false);
  const r = (v, up) => (up ? Math.ceil(v * 20 - 1e-9) : Math.floor(v * 20 + 1e-9)) / 20;   // round out to 0.05° so small pans reuse the same answer
  const box = { s: r(s - STR.pad, false), w: r(w - STR.pad, false), n: r(n + STR.pad, true), e: r(e + STR.pad, true) };
  if (STR.loading[st]) return STR.loading[st].then(() => false);   // same state already being asked: the view is covered by then (usually)
  if (STR.failAt[st] && Date.now() - STR.failAt[st] < 120000) { STR.note = "Couldn't reach the " + STATE_RAMPS[st].credit + " — try again in a minute."; return Promise.resolve(false); }
  const c = STATE_RAMPS[st];
  const qs = new URLSearchParams({ where: "1=1", geometry: [box.w, box.s, box.e, box.n].map(v => v.toFixed(2)).join(","), geometryType: "esriGeometryEnvelope", inSR: "4326", spatialRel: "esriSpatialRelIntersects",
    outFields: c.f, returnGeometry: "true", outSR: "4326", resultRecordCount: "2000", f: "json" });
  STR.loading[st] = (async () => {
    try {
      const res = await fetch(c.url + "/query?" + qs.toString());
      if (!res.ok) throw new Error("http " + res.status);
      const data = await res.json();
      if (data.error || !Array.isArray(data.features)) throw new Error("bad answer");
      const seen = new Set(), items = data.features.map(f => stPlace(st, f)).filter(x => x && !seen.has(x.key) && seen.add(x.key));
      const b = { st, s: box.s, w: box.w, n: box.n, e: box.e, t: Date.now(), items };
      STR.boxes = STR.boxes.filter(o => !(o.st === st && stHas(b, o.s, o.w, o.n, o.e))).concat([b]).slice(-STR.keep);
      stSave();
      STR.failAt[st] = 0;
      return true;
    } catch (err) {
      STR.failAt[st] = Date.now(); STR.note = "Couldn't reach the " + c.credit + " — try again in a minute.";
      return false;   // what this phone already holds is still drawn
    } finally { delete STR.loading[st]; }
  })();
  return STR.loading[st];
}

// Every agency place this phone holds (older copies included, so it works offline)
function stItems() {
  if (!STR.read) stRead();
  const seen = new Set(), all = [];
  Object.keys(STR.snap).forEach(st => (STR.snap[st] || []).forEach(o => { if (!seen.has(o.key)) { seen.add(o.key); all.push(o); } }));
  STR.boxes.forEach(b => b.items.forEach(o => { if (!seen.has(o.key)) { seen.add(o.key); all.push(o); } }));
  return all;
}

// ---- what js/37 calls: agency lists + OpenStreetMap together ----
function outsideLoad(bounds) {
  const a = typeof osmOlLoad === "function" ? osmOlLoad(bounds) : Promise.resolve(false);
  return Promise.all([a, stLoad(bounds)]).then(r => r.some(Boolean));
}
function outsideItems() {
  const st = stItems(), osm = typeof osmOlItems === "function" ? osmOlItems() : [];
  if (!st.length) return osm;
  // an OpenStreetMap ramp within ~200 yards of an agency ramp is the same place: the agency's wins
  const near = (o, p) => Math.abs(o.lat - p.lat) < 0.002 && Math.abs(o.lng - p.lng) < 0.0025;
  return st.concat(osm.filter(o => !st.some(p => near(o, p))));
}
const outsideNote = () => (typeof osmOlNote === "function" && osmOlNote()) || STR.note || "";
