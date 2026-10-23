// test188: nationwide official ramp lists (js/61, state wildlife agencies on free map servers, public + open only) and the built-in NOAA
// tide + water-temperature station lists for every coastal state (js/60, wired into js/02). Florida must stay exactly as before.
const fs = require("fs"), vm = require("vm"), path = require("path"), { execSync } = require("child_process");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const cut = (s, a, b) => { const i = s.indexOf(a); if (i < 0) throw new Error("missing " + a); return s.slice(i, s.indexOf(b, i)); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- 1) the NOAA station lists (js/60) ----------
const c60 = { console, Math, isFinite, Array, Object, Set, RegExp };
vm.createContext(c60);
vm.runInContext(read("js/60-noaa-stations.js") + "\nthis.api = { TIDE_STATIONS_US, WT_STATIONS_US };", c60);
const { TIDE_STATIONS_US: TU, WT_STATIONS_US: WU } = c60.api;
const COAST = "AL CA CT DE DC GA LA ME MD MA MS NH NJ NY NC OR PA RI SC TX VA WA".split(" "), LAKES = COAST.concat(["MI", "MN", "OH"]);   // water-temperature stations also sit on the Great Lakes
ok(TU.length > 1500 && WU.length > 100, `lists are big enough (${TU.length} tide, ${WU.length} water-temperature)`);
ok(new Set(TU.map(t => t.id)).size === TU.length && new Set(WU.map(t => t.id)).size === WU.length, "no station twice in either list");
ok(TU.every(t => /^\d{7}$/.test(t.id) && t.name && !/["\\]/.test(t.name) && isFinite(t.lat) && isFinite(t.lng) && COAST.includes(t.state)), "every tide row has a 7-digit NOAA id, a name, a place and a coastal state");
ok(WU.every(t => /^\d{7}$/.test(t.id) && t.name && isFinite(t.lat) && isFinite(t.lng) && LAKES.includes(t.state)), "every water-temperature row is the same shape (coastal states + Great Lakes)");
ok(!TU.concat(WU).some(t => t.state === "FL"), "nothing for Florida in the new lists (Florida keeps js/02)");
ok(TU.every(t => t.lat > 24.5 && t.lat < 49.5 && t.lng > -125 && t.lng < -66.5), "every station is inside the lower 48");
const need = { AL: 1, CA: 1, CT: 1, DE: 1, GA: 1, LA: 1, ME: 1, MD: 1, MA: 1, MS: 1, NH: 1, NJ: 1, NY: 1, NC: 1, OR: 1, RI: 1, SC: 1, TX: 1, VA: 1, WA: 1 };
Object.keys(need).forEach(st => ok(TU.some(t => t.state === st), "tide stations for " + st));
const noWt = Object.keys(need).filter(st => !WU.some(t => t.state === st));
ok(noWt.length <= 4, "water-temperature stations for nearly every coastal state (none for: " + (noWt.join(", ") || "—") + ")");
ok(WU.some(t => /^Portland$/.test(t.name) && t.state === "ME") && WU.some(t => t.name === "Alameda" && t.state === "CA") && WU.some(t => t.name === "Cleveland" && t.state === "OH"), "Portland (Maine), the San Francisco Bay and Lake Erie have water-temperature stations");
ok(WU.filter(t => t.mi === 10).every(t => /\b(river|creek|canal|bayou|slough|channel)\b/i.test(t.name)) && WU.some(t => t.mi === 10), "river / creek stations only speak for 10 miles");
ok(WU.every(t => t.mi === undefined || t.mi === 10), "no other special distances");
// the water-temperature rows are all real NOAA stations of the tide list or at least sit near a known one
const near = (a, b) => Math.abs(a.lat - b.lat) < 0.5 && Math.abs(a.lng - b.lng) < 0.5;
ok(WU.filter(w => TU.some(t => near(w, t))).length >= WU.length - 30, "nearly every water-temperature station has a tide station within about 30 miles (the Great Lakes have none)");

// ---------- 2) js/02: Florida's lists untouched, new lists used by the nearest-station lookups ----------
const t02 = read("js/02-spots.js");
let t02old = null; try { t02old = execSync("git show HEAD:js/02-spots.js", { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch (e) { /* no git: skip the side-by-side */ }
const FLtide = s => cut(s, "  const TIDE_STATIONS = [", "  ];"), FLwt = s => cut(s, "  const WT_STATIONS = [", "  ];");
if (t02old && /const TIDE_STATIONS = \[/.test(t02old)) {
  ok(FLtide(t02) === FLtide(t02old) && FLwt(t02) === FLwt(t02old), "Florida's TIDE_STATIONS and WT_STATIONS are word for word what they were");
} else ok(true, "(no git history here: the Florida side-by-side is skipped)");
const miles = (a, b, c, d) => { const r = x => x * Math.PI / 180, h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2; return 3958.8 * 2 * Math.asin(Math.sqrt(h)); };
function lookups(withUs) {
  const c = { console, Math, isFinite, Array, Object, Set, miles, extraStations: [], STATION: "8722859", hasLoc: s => s && s.lat != null && s.lng != null, lookupStationsNear: () => { c.asked = (c.asked || 0) + 1; }, WT_STATION_MI: 20 };
  vm.createContext(c);
  const src = FLtide(t02) + "  ];\n" + FLwt(t02) + "  ];\n" + cut(t02, "  const tideAll", "  // Each station's") + cut(t02, "  function wtSourceFor", "  // Last resort") +
    "\nthis.api = { stationFor, wtSourceFor, wtNearest, tideAll, wtAll };";
  vm.runInContext(src, c);
  if (withUs) vm.runInContext("const TIDE_STATIONS_US = " + JSON.stringify(TU) + "; const WT_STATIONS_US = " + JSON.stringify(WU) + ";", c);
  return c;
}
const OLD = lookups(false), NEW = lookups(true);
const flSpots = [[26.24, -80.10], [24.56, -81.80], [27.76, -82.63], [30.4, -87.2], [30.33, -81.66], [26.6, -80.03]];
flSpots.forEach(([la, ln]) => {
  const a = OLD.api.stationFor({ lat: la, lng: ln }), b = NEW.api.stationFor({ lat: la, lng: ln });
  const wa = OLD.api.wtSourceFor(la, ln), wb = NEW.api.wtSourceFor(la, ln);
  ok(a.id === b.id && (wa ? wa.id : null) === (wb ? wb.id : null), `Florida spot ${la},${ln}: same tide station (${a.id}) and water-temperature station (${wa ? wa.id : "none"}) as before`);
});
const bos = NEW.api.stationFor({ lat: 42.36, lng: -71.05 }), oldBos = OLD.api.stationFor({ lat: 42.36, lng: -71.05 });
ok(/^84/.test(bos.id) && bos.dist < 5 && oldBos.dist > 500, `Boston harbor now has its own tide station (${bos.name}, ${bos.dist.toFixed(1)} mi); before the nearest was ${oldBos.dist.toFixed(0)} mi away`);
ok(OLD.asked === 1 && !NEW.asked, "a spot near Boston asked NOAA live before; with the list it does not");
const gal = NEW.api.wtSourceFor(29.31, -94.79), sf = NEW.api.wtSourceFor(37.78, -122.30), mid = NEW.api.wtSourceFor(39.0, -98.0);
ok(gal && gal.state === "TX" && sf && sf.state === "CA", "Galveston and San Francisco get a local water-temperature station");
ok(mid === null, "the middle of Kansas has none (the ocean model is used, as before)");
ok(NEW.api.wtNearest(42.36, -71.05, 2, 60).length >= 1, "the comparison readings find stations near Boston");
ok(NEW.api.tideAll().length === OLD.api.tideAll().length + TU.length, "tideAll = Florida + the new list + stations asked of NOAA");
// colder water is believable now (a Maine bay in March really reads 38°F)
const wr = cut(t02, "  const WT_RANGE", "  // The nearest station that is close enough");
const cr = { isFinite }; vm.createContext(cr); vm.runInContext(wr + "\nthis.ok = okTemp;", cr);
ok(cr.ok(38) === true && cr.ok(95) === true && cr.ok(29) === false && cr.ok(96.5) === false && cr.ok(NaN) === false, "water temperature 30–96°F is believable (was 45–96, which threw out real cold-water readings)");

// ---------- 3) js/61: each state's keep/skip rules on made-up rows ----------
const src61 = read("js/61-state-ramps.js");
let calls = [], answers = {}, mode = "ok", stateAt = () => "GA";
const store = {};
const c61 = { console, Math, isFinite, Array, Object, Set, Promise, Date, JSON, RegExp, String, Number, URLSearchParams, parseInt, setTimeout,
  stateOf: (la, ln) => stateAt(la, ln), localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } },
  fetch: async url => { if (/data\/ramps\//.test(url)) return { ok: false, status: 404 };   // (v177 saved lists: test189; here they are not published, so the live path is tested)
    calls.push(url); if (mode === "down") throw new Error("offline"); if (mode === "bad") return { ok: true, json: async () => ({ error: { code: 500 } }) };
    const st = Object.keys(c61.api.STATE_RAMPS).find(k => url.startsWith(c61.api.STATE_RAMPS[k].url + "/query?")); return { ok: true, json: async () => answers[st] || { features: [] } }; } };
vm.createContext(c61);
vm.runInContext(src61 + "\nthis.api = { STATE_RAMPS, stPlace, stLoad, stItems, outsideItems, outsideLoad, outsideNote, STR };", c61);
const S = c61.api;
const WANT = "AL AR CT DE GA ID IA IN KY LA MA MD ME MI MN MO MT NC NE NH NJ NM NY OH OR RI SC TN TX UT VA VT WA WI WV".split(" ");
ok(JSON.stringify(Object.keys(S.STATE_RAMPS).sort()) === JSON.stringify(WANT.slice().sort()), `agency lists for ${WANT.length} states: ${WANT.slice().sort().join(" ")}`);
ok(!S.STATE_RAMPS.FL, "no Florida list (Florida keeps FWC / FL DEP)");
ok(Object.values(S.STATE_RAMPS).every(c => /^https:\/\//.test(c.url) && c.credit && c.f && typeof c.name === "function" && typeof c.keep === "function"), "every state has an https address, a credit line, its fields, a name rule and a public-and-open rule");
const feat = (a, x, y) => ({ attributes: a, geometry: { x: x == null ? -83.5 : x, y: y == null ? 33.5 : y } });
// [state, row, kept?, what]
const R = [
  ["NC", { BAA_Name: "BELHAVEN", Site_Status: "OPEN", Water_Access: "PUNGO RIVER", County: "BEAUFORT", Owner: "NC WRC", Launch_Lane_No: 2 }, true, "NC open ramp"],
  ["NC", { BAA_Name: "AVALON", Site_Status: "CLOSED TEMPORARILY", Owner: "NC WRC" }, false, "NC closed temporarily"],
  ["ME", { WATER_BODY: "Moosehead Lake", MCD: "GREENVILLE", OWNSHIP: "DIFW", TYPE: "TR" }, true, "ME state ramp"],
  ["ME", { WATER_BODY: "Dam Pond", OWNSHIP: "BROOKFIELD RENEWABLE ENERGY GROUP", TYPE: "TR" }, false, "ME power company ramp"],
  ["MA", { FACNAME: "Lake Quinsigamond", RESTRICTED: "No", PENDING: "No", RAMPTYPE: "Concrete", NOLANES: 2, FEE: "No", MAINTRESP: "DFW" }, true, "MA open ramp"],
  ["MA", { FACNAME: "Town Landing", RESTRICTED: "Yes", PENDING: "No" }, false, "MA restricted"],
  ["CT", { ACCSS_NAME: "Bantam Lake Boat Launch", STATUS: "Open" }, true, "CT open"],
  ["CT", { ACCSS_NAME: "Black Pond Boat Launch", STATUS: "Temporarily Closed " }, false, "CT closed"],
  ["RI", { NAME: "Wallum Lake", TYPE: "trailer ramp", RSTRCTN: "none", Wat_Ttp: "Fresh" }, true, "RI trailer ramp"],
  ["RI", { NAME: "Brook Fishing Spot", TYPE: "fishing access" }, false, "RI fishing-only access"],
  ["NH", { FACILITY: "Boundary Pond", WATER_BODY: "Boundary Pond", FGTYPE: "RAMP", BOAT: "Yes", OWNERSHIP: "State - NHFG" }, true, "NH state ramp"],
  ["NH", { FACILITY: "Camp Beach", FGTYPE: "SHOREBANK", BOAT: "Yes", OWNERSHIP: "State - NHFG" }, false, "NH bank fishing"],
  ["NH", { FACILITY: "Lakeview Landing", FGTYPE: "RAMP", BOAT: "Yes", OWNERSHIP: "Private - HOA" }, false, "NH private owner"],
  ["VT", { AccessName: "Brownington Pond", AccessType: "Boating/Fishing", RampType: "Concrete Plank" }, true, "VT boating access"],
  ["VT", { AccessName: "Bank Spot", AccessType: "Fishing" }, false, "VT fishing only"],
  ["NY", { WATERBODY: "Hudson River", ACCESS_TYP: "Hard surface launch", AGENCY: "DEC", COUNTY: "Ulster" }, true, "NY DEC launch"],
  ["NY", { WATERBODY: "Power Pond", ACCESS_TYP: "Hard surface launch", AGENCY: "Brookfield Renewable Energy" }, false, "NY power company"],
  ["NJ", { STREET: "Bay Ave", MUN_LABEL: "Barnegat", COUNTY_LAB: "Ocean County", BOATLNCH: "Yes", MARINA: "No" }, true, "NJ public boat launch"],
  ["NJ", { STREET: "Main St", BOATLNCH: "Yes", MARINA: "Yes" }, false, "NJ marina"],
  ["NJ", { STREET: "Beach Rd", BOATLNCH: "No", MARINA: "No" }, false, "NJ no launch"],
  ["DE", { GNIS_NAME: "Broad Creek", FACILITY: "Boat Ramp", PUBLICACCESS: "Yes", COUNTY: "Sussex" }, true, "DE public ramp"],
  ["DE", { GNIS_NAME: "Old Dock", FACILITY: "Boat Dock", PUBLICACCESS: "Yes" }, false, "DE boat dock (not a ramp)"],
  ["DE", { GNIS_NAME: "Club Ramp", FACILITY: "Boat Ramp", PUBLICACCESS: "No" }, false, "DE not public"],
  ["MD", { SiteName: "Sandy Point", BoatRamp: "Yes", RampLanes: 4, FeePermitReq: "Yes", County: "ANNE ARUNDEL" }, true, "MD ramp"],
  ["MD", { SiteName: "Creek Landing", BoatRamp: "No" }, false, "MD no ramp"],
  ["VA", { SITENAME: "Pohick Bay", On_List: "Y", TYPE: "R", Owner: "DWR" }, true, "VA listed ramp"],
  ["VA", { SITENAME: "Old Spot", On_List: "N", TYPE: "R" }, false, "VA not on the list"],
  ["WV", { SiteName: "Burnsville Lake", AccessType: "Ramp", Ownership: "US Army Corps of Engineers" }, true, "WV ramp"],
  ["WV", { SiteName: "Camp Pond", AccessType: "Ramp", Ownership: "Private" }, false, "WV private"],
  ["WV", { SiteName: "Bank", AccessType: "Fishing", Ownership: "WVDNR" }, false, "WV fishing only"],
  ["SC", { Boat_Ramp_Name: "Santee Ramp", County: "Clarendon", Body_of_Water: "Lake Marion" }, true, "SC ramp"],
  ["GA", { Name: "Lake Lanier Ramp", Draw: "Public", Status: "Open", Ramp: "Y", Owner: "COE", NumLanes: 3 }, true, "GA open public ramp"],
  ["GA", { Name: "Club Ramp", Draw: "No", Status: "Open", Ramp: "Y" }, false, "GA not public"],
  ["GA", { Name: "Sinkhole", Draw: "Public", Status: "Closed", Ramp: "Y" }, false, "GA closed"],
  ["GA", { Name: "Unsure", Draw: "Public", Status: "Unknown", Ramp: "Y" }, false, "GA status unknown (unsure → left out)"],
  ["GA", { Name: "Bank Spot", Draw: "Public", Status: "Open", Ramp: "N" }, false, "GA no ramp"],
  ["GA", { Name: "Camp Ramp", Draw: "Public", Status: "Open", Ramp: "Y", Owner: "Private" }, false, "GA private owner"],
  ["AL", { Name: "Bayou la Batre Ramp" }, true, "AL coastal ramp"],
  ["TN", { Name: "Tannery Island", Owner: "TWRA", Ramps: 1 }, true, "TN ramp"],
  ["TN", { Name: "Camp", Owner: "Private Land", Ramps: 1 }, false, "TN private land"],
  ["KY", { SiteName: "Lake Barkley", AccessType: "Any Boat", Boat_Ramp: "Year-Round_All-Hours", display: 1 }, true, "KY ramp"],
  ["KY", { SiteName: "Bank", AccessType: "Bank Access", Boat_Ramp: "None", display: 1 }, false, "KY bank access"],
  ["OH", { SiteName: "Adams Lake", Facility_Type: "Boat Launch", Status: "Active", Public_: "Yes", AdminType: "State", HandLaunchOnly: "No" }, true, "OH state launch"],
  ["OH", { SiteName: "Fox Marina", Facility_Type: "Dock/Marina", Status: "Active", Public_: "Yes", AdminType: "Commercial" }, false, "OH marina"],
  ["OH", { SiteName: "Yacht Club", Facility_Type: "Boat Launch", Status: "Active", Public_: "Yes", AdminType: "Club" }, false, "OH club"],
  ["OH", { SiteName: "Members Only", Facility_Type: "Boat Launch", Status: "Active", Public_: "No", AdminType: "State" }, false, "OH not public"],
  ["MI", { name: "Long Lake", BAS_Type: "Boating Access Site", OWNEDBY: "DNR-PRD", nLanes: 2 }, true, "MI DNR site"],
  ["MI", { name: "Camp Lake", BAS_Type: "Boating Access Site", OWNEDBY: "Private" }, false, "MI private"],
  ["IN", { site_name: "Lake Shafer", boat_ramp: "Yes", land_type: "Public Access Site" }, true, "IN ramp"],
  ["IN", { site_name: "Shore", boat_ramp: "No", land_type: "Public Access Site" }, false, "IN no ramp"],
  ["WI", { LMS_BOAT_LANDING_NAME: "Lake Mendota", LANDING_TYPE_CODE: "RAMP", ABANDON_FLAG: "No", OWNERSHIP_NAME_TEXT: "STATE(DNR)" }, true, "WI ramp"],
  ["WI", { LMS_BOAT_LANDING_NAME: "Old Landing", LANDING_TYPE_CODE: "RAMP", ABANDON_FLAG: "Yes", OWNERSHIP_NAME_TEXT: "COUNTY" }, false, "WI abandoned"],
  ["WI", { LMS_BOAT_LANDING_NAME: "Cabin Landing", LANDING_TYPE_CODE: "RAMP", ABANDON_FLAG: "No", OWNERSHIP_NAME_TEXT: "OTHER" }, false, "WI owner 'other' (unsure → left out)"],
  ["MN", { access_name: "Lake Minnetonka", launch_type: "Trailer Launch", administrator: "DNR Division of Parks and Trails", county_name: "Hennepin" }, true, "MN access"],
  ["IA", { Name: "dewey's pasture complex", Source: "Water Access" }, true, "IA ramp"],
  ["IA", { Name: "photo spot", Source: "airphotos/maps" }, false, "IA guessed from photos"],
  ["MO", { Area_Name: "Truman Ramp" }, true, "MO ramp"],
  ["AR", { flabel: "Caney Creek", ftype: "Boating Access", fdescrip: "Concrete", waterbody: "Conway Lake" }, true, "AR ramp"],
  ["LA", { Boat_Launc: "Bayou Ramp", Access: "Public", Waterbody: "Bayou" }, true, "LA public"],
  ["LA", { Boat_Launc: "Camp Launch", Access: "Private; pay to launch" }, false, "LA private"],
  ["TX", { AccessType: "Lake/Reservoir", AccessTypeDescription: "Lake Texoma" }, true, "TX ramp"],
  ["NM", { Water_name: "Bataan Lake", Ownership: "City of Carlsbad" }, true, "NM ramp"],
  ["NE", { rAreaName: "Bridgeport SRA", AccessType: "Public", Ramp_Status: "Open", rNumLanes: 1 }, true, "NE open public ramp"],
  ["NE", { rAreaName: "Old Ramp", AccessType: "Public", Ramp_Status: "Closed" }, false, "NE closed"],
  ["NE", { rAreaName: "Farm", AccessType: "Private", Ramp_Status: "Open" }, false, "NE private"],
  ["NE", { rAreaName: "Low Water", AccessType: "Public", Ramp_Status: "Caution - Low Water" }, false, "NE low water (not open)"],
  ["MT", { NAME: "Beaverhead", BOAT_FAC: "Ramp (Concrete)" }, true, "MT ramp"],
  ["MT", { NAME: "Bank", BOAT_FAC: "No Boat Facilities" }, false, "MT no boat facilities"],
  ["ID", { site_name: "Dawson Lake", status: "Active", ramp: "yes", county: "Bonner" }, true, "ID ramp"],
  ["ID", { site_name: "Old", status: "Closed", ramp: "yes" }, false, "ID closed"],
  ["ID", { site_name: "Bank", status: "Active", ramp: "no" }, false, "ID no ramp"],
  ["UT", { Name: "Utah Lake Ramp", OWNER: "State", AGENCY: "DNR", Vessels: "any" }, true, "UT state ramp"],
  ["UT", { Name: "Ranch Ramp", OWNER: "Private", AGENCY: "Private" }, false, "UT private"],
  ["WA", { BoatRampName: "Lake Washington Ramp" }, true, "WA ramp"],
  ["OR", { name: "Sand Lake", public_display: "Yes", facility_type: "Boat Ramp", launch_type: "Trailered Boat Launch", manager: "Oregon Parks and Recreation Department", county: "Tillamook" }, true, "OR ramp"],
  ["OR", { name: "Marina", public_display: "Yes", facility_type: "Marina", manager: "Private" }, false, "OR marina"],
  ["OR", { name: "Hidden", public_display: "No", facility_type: "Boat Ramp", manager: "County" }, false, "OR not for display"],
  ["OR", { name: "Washed Out", public_display: "Yes", facility_type: "Boat Ramp", oa_status: "Closed", manager: "County" }, false, "OR closed"]
];
R.forEach(([st, row, keep, what]) => {
  const p = S.stPlace(st, feat(row)), got = p !== null;
  ok(got === keep, (keep ? "kept: " : "left out: ") + what);
  if (keep) ok(p.source === "state-ramp" && p.trust === "official" && p.state === st && p.kind !== undefined && p.name && p.credit === S.STATE_RAMPS[st].credit && p.id === null, "   …shaped like an official spot with the agency credit (" + st + ")");
});
const withState = new Set(R.filter(r => r[2]).map(r => r[0])), rejects = new Set(R.filter(r => !r[2]).map(r => r[0]));
const noRule = WANT.filter(s => !withState.has(s));
ok(noRule.length === 0, "every state has a kept example" + (noRule.length ? " (missing " + noRule.join(", ") + ")" : ""));
// card text
const lakeL = S.stPlace("MA", feat(R[4][1])), nc = S.stPlace("NC", feat(R[0][1])), nj = S.stPlace("NJ", feat(R[17][1])), de = S.stPlace("DE", feat({ GNIS_NAME: "Fishing Pier Spot", FACILITY: "Fishing Pier", PUBLICACCESS: "Yes" })), ca = S.stPlace("DE", feat({ GNIS_NAME: "Canoe Spot", FACILITY: "Canoe Launch", PUBLICACCESS: "Yes" }));
ok(nc.name === "Belhaven" && nc.details.lanes === 2 && nc.details.water === "Pungo River" && nc.county === "Beaufort", "ALL-CAPS agency names are tidied (BELHAVEN → Belhaven) and lanes / water / county are filled in");
ok(nj.county === "Ocean" && lakeL.details.lanes === 2 && lakeL.details.fee === "No", "'Ocean County' does not become 'Ocean county County'; fee and lanes are carried over");
ok(de.kind === "pier" && ca.details.type === "Hand launch", "a Delaware fishing pier is a pier and a canoe launch is a Hand launch");
ok(S.stPlace("GA", { attributes: { Name: "x" }, geometry: {} }) === null && S.stPlace("GA", { attributes: { Name: "x" }, geometry: { x: 0, y: 0 } }) === null, "a place with no position is dropped");
stateAt = () => "FL"; ok(S.stPlace("GA", feat(R.find(r => r[0] === "GA")[1])) === null, "a place that turns out to be inside Florida is dropped (Florida keeps its own lists)");
stateAt = () => "GA";
const picked = (() => { const c = c61; const p = S.stPlace("MA", feat({ FACNAME: "Pond", RAMPTYPE: "Cartop", RESTRICTED: "No", PENDING: "No" })); return p && p.details.type; })();
ok(picked === "Hand launch", "a cartop-only launch is shown as a Hand launch");

// ---------- 4) js/61: asking the agency, keeping the answer, Florida and states without a list ----------
const bounds = (s, w, n, e) => ({ getSouth: () => s, getWest: () => w, getNorth: () => n, getEast: () => e });
(async () => {
  const gaRows = { features: [feat({ Name: "Lake Lanier Ramp", Draw: "Public", Status: "Open", Ramp: "Y", Owner: "COE", NumLanes: 3 }, -83.52, 33.52), feat({ Name: "Club", Draw: "No", Status: "Open", Ramp: "Y" }, -83.5, 33.5), feat({ Name: "Lake Lanier Ramp", Draw: "Public", Status: "Open", Ramp: "Y" }, -83.52, 33.52)] };
  answers.GA = gaRows;
  stateAt = () => "GA";
  let changed = await S.stLoad(bounds(33.4, -83.7, 33.6, -83.4));
  ok(changed === true && calls.length === 1 && calls[0].startsWith(S.STATE_RAMPS.GA.url + "/query?"), "a Georgia view asks Georgia's server once");
  const q = new URL(calls[0]).searchParams;
  ok(q.get("geometryType") === "esriGeometryEnvelope" && q.get("inSR") === "4326" && q.get("outSR") === "4326" && q.get("f") === "json" && q.get("returnGeometry") === "true" && q.get("outFields") === S.STATE_RAMPS.GA.f, "…asking for the view's box in lat/lng, only the fields it needs");
  const [w, s, e, n] = q.get("geometry").split(",").map(Number);
  ok(w <= -83.7 && e >= -83.4 && s <= 33.4 && n >= 33.6 && e - w < 0.9, "…for the view plus a small margin");
  ok(S.stItems().length === 1 && S.stItems()[0].name === "Lake Lanier Ramp", "only the public, open ramp is kept (and a repeat in the answer is counted once)");
  calls = [];
  changed = await S.stLoad(bounds(33.45, -83.65, 33.55, -83.45));
  ok(changed === false && calls.length === 0, "panning inside the same box asks nothing (kept on this phone)");
  ok(/fm-st-ramps-v1/.test(Object.keys(store).join()) && JSON.parse(store["fm-st-ramps-v1"]).boxes.length === 1, "the answer is saved on the phone");
  ok(S.outsideItems().length === 1, "outsideItems gives the agency's ramps");

  // OpenStreetMap place right next to it is the same ramp → the agency's wins; a farther one stays
  c61.osmOlItems = () => [{ key: "osm/1", source: "osm", name: "Lanier ramp (map)", lat: 33.5205, lng: -83.5195 }, { key: "osm/2", source: "osm", name: "Other city ramp", lat: 33.56, lng: -83.45 }];
  const items = S.outsideItems();
  ok(items.length === 2 && items[0].source === "state-ramp" && items.some(o => o.key === "osm/2") && !items.some(o => o.key === "osm/1"), "an OpenStreetMap ramp within about 200 yards of an agency ramp is dropped; a farther one stays");

  // Florida: nothing asked
  stateAt = () => "FL"; calls = [];
  changed = await S.stLoad(bounds(26.0, -80.3, 26.3, -80.0));
  ok(changed === false && calls.length === 0, "an all-Florida view asks no agency server");
  // a state with no list
  stateAt = () => "PA"; calls = [];
  changed = await S.stLoad(bounds(40.0, -76.3, 40.3, -76.0));
  ok(changed === false && calls.length === 0, "a Pennsylvania view (no usable list) asks nothing — OpenStreetMap covers it");
  // two states in one view
  answers.SC = { features: [feat({ Boat_Ramp_Name: "Savannah River Ramp", County: "Jasper", Body_of_Water: "Savannah River" }, -81.1, 32.4)] };
  answers.GA = { features: [feat({ Name: "River Ramp GA", Draw: "Public", Status: "Open", Ramp: "Y" }, -81.2, 32.2)] };
  stateAt = (la) => (la > 32.3 ? "SC" : "GA"); calls = [];
  changed = await S.stLoad(bounds(32.0, -81.6, 32.6, -80.9));
  ok(changed === true && calls.length === 2 && calls.some(u => u.startsWith(S.STATE_RAMPS.SC.url)) && calls.some(u => u.startsWith(S.STATE_RAMPS.GA.url)), "a view across two states asks both states");
  ok(S.stItems().length === 3, "both answers are kept");
  // a view too wide asks nothing
  calls = [];
  ok(await S.stLoad(bounds(30, -90, 34, -85)) === false && calls.length === 0, "a view more than 1.2° wide asks nothing (the map says to zoom in)");
  // server down
  stateAt = () => "TN"; calls = []; mode = "down";
  changed = await S.stLoad(bounds(36.0, -84.0, 36.2, -83.8));
  ok(changed === false && S.outsideNote() === "Couldn't reach the " + S.STATE_RAMPS.TN.credit + " — try again in a minute.", "when the agency's server is down the note says so in plain words");
  calls = []; await S.stLoad(bounds(36.0, -84.0, 36.2, -83.8));
  ok(calls.length === 0, "…and it is not asked again for two minutes");
  ok(S.stItems().length === 3, "…and what the phone already holds is still shown");
  mode = "bad"; stateAt = () => "VT"; calls = [];
  changed = await S.stLoad(bounds(44.0, -73.0, 44.2, -72.8));
  ok(changed === false && /Couldn't reach/.test(S.outsideNote()), "an error answer from a server is treated like being down");
  mode = "ok";

  // ---------- 5) wiring ----------
  const t37 = read("js/37-official-layer.js"), idx = read("index.html"), sw = read("sw.js");
  ok(/outsideLoad\(b\)/.test(t37) && /outsideItems\(\)/.test(t37) && /outsideNote\(\)/.test(t37), "the official layer asks js/61 (agency lists + OpenStreetMap together)");
  ok(/OL_CREDIT\[o\.source\] \|\| o\.credit/.test(t37) && /o\.credit \|\| suggSourceName/.test(t37), "the tap card and the saved spot's note name the agency");
  const order = f => idx.indexOf('src="js/' + f);
  ok(order("58-osm") < order("59-us-lakes") && order("59-us-lakes") < order("60-noaa-stations") && order("60-noaa-stations") < order("61-state-ramps") && order("61-state-ramps") < order("99-boot"), "index.html loads js/60 and js/61 after js/59 and before js/99");
  ok(/js\/60-noaa-stations\.js/.test(sw) && /js\/61-state-ramps\.js/.test(sw), "the offline file list (sw.js) has both new files");
  // no new global name clashes: every top-level const / function name in js/60 and js/61 is new in the other files
  const names = s => (s.match(/^(?:const|let|function|async function)\s+([A-Za-z_$][\w$]*)/gm) || []).map(x => x.split(/\s+/).pop());
  const mine = names(read("js/60-noaa-stations.js")).concat(names(src61));
  const others = fs.readdirSync(path.join(root, "js")).filter(f => f.endsWith(".js") && !/^(60|61)-/.test(f)).map(f => read("js/" + f)).join("\n");
  const clash = mine.filter(n => new RegExp("(?:^|[\\s;(])(?:const|let|var|function)\\s+" + n.replace(/\$/g, "\\$") + "\\b").test(others));
  ok(clash.length === 0, "no top-level name in js/60 or js/61 is also declared in another file" + (clash.length ? " (clash: " + clash.join(", ") + ")" : ""));
  // shown in the app
  const wn = read("js/13-groups-misc.js"), hist = read("docs/build_history.md");
  ok(/ramp lists from state/i.test(wn.slice(wn.indexOf("WHATS_NEW"), wn.indexOf("WHATS_NEW") + 3000)) || /state wildlife/i.test(wn.slice(wn.indexOf("WHATS_NEW"), wn.indexOf("WHATS_NEW") + 3000)), "What's new mentions the state ramp lists");
  ok(/v176/.test(hist), "build history has v176");
  console.log(bad ? `\n${bad} FAILED` : "\nALL OK");
  process.exit(bad ? 1 : 0);
})();
