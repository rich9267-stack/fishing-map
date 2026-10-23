// test187: every time shown for a spot uses that spot's own time zone (tzFor + tz helpers in js/53, used by js/01, 02, 04, 06, 09, 10).
// Weather and the water-temperature backup used to ask for Eastern time everywhere. Florida (Eastern) must look exactly the same;
// the Panhandle west of the Apalachicola River is Central; Arizona has no daylight saving. Games keep the New York day on purpose.
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const cut = (s, a, b) => { const i = s.indexOf(a); if (i < 0) throw new Error("missing " + a); return s.slice(i, s.indexOf(b, i)); };

// the real state outlines + the new helpers
const c53 = { console, Math, isFinite, Date, Intl, Array, Object, Set, Number, String };
vm.createContext(c53);
vm.runInContext(read("js/53-us-states.js") + "\nthis.api = { tzFor, tzClock, tzHour, tzHourLabel, tzDayKey, tzDayStart, tzDayDiff, areaTz, tzGood };", c53);
const A = c53.api;

// ---------- 1) the zone for a place ----------
const E = "America/New_York", C = "America/Chicago", M = "America/Denver", P = "America/Los_Angeles", AZ = "America/Phoenix";
const places = [
  ["Pompano Beach FL", 26.24, -80.10, E], ["Key West FL", 24.56, -81.80, E], ["Miami FL", 25.77, -80.19, E], ["Tampa Bay FL", 27.76, -82.63, E],
  ["Naples FL", 26.14, -81.80, E], ["Jacksonville FL", 30.33, -81.66, E], ["Cedar Key FL", 29.14, -83.03, E], ["Apalachicola FL", 29.72, -84.98, E],
  ["Port St. Joe FL", 29.81, -85.31, E], ["Mexico Beach FL", 29.94, -85.42, C], ["Panama City FL", 30.16, -85.66, C], ["Destin FL", 30.39, -86.50, C],
  ["Pensacola FL", 30.40, -87.21, C], ["Lake Okeechobee FL", 26.95, -80.85, E],
  ["Savannah GA", 32.08, -81.09, E], ["New York NY", 40.71, -74.0, E], ["Detroit MI", 42.33, -83.05, E], ["Indianapolis IN", 39.77, -86.16, E],
  ["Knoxville TN", 35.96, -83.92, E], ["Louisville KY", 38.25, -85.76, E],
  ["Mobile AL", 30.69, -88.04, C], ["Houston TX", 29.76, -95.37, C], ["Galveston TX", 29.30, -94.80, C], ["Amarillo TX", 35.2, -101.83, C],
  ["Chicago IL", 41.88, -87.63, C], ["Gary IN", 41.6, -87.33, C], ["Evansville IN", 37.97, -87.57, C], ["Nashville TN", 36.16, -86.78, C],
  ["Bowling Green KY", 36.99, -86.44, C], ["Omaha NE", 41.26, -95.93, C], ["Fargo ND", 46.88, -96.79, C], ["Bismarck ND", 46.81, -100.78, C], ["Pierre SD", 44.37, -100.35, C],
  ["Minneapolis MN", 44.98, -93.27, C], ["Lake Pontchartrain LA", 30.15, -90.1, C], ["Lake of the Ozarks MO", 38.15, -92.6, C],
  ["El Paso TX", 31.76, -106.49, M], ["Denver CO", 39.74, -104.99, M], ["Salt Lake City UT", 40.76, -111.89, M], ["Boise ID", 43.62, -116.2, M],
  ["Billings MT", 45.78, -108.5, M], ["Santa Fe NM", 35.69, -105.94, M], ["Rapid City SD", 44.08, -103.23, M], ["Cheyenne WY", 41.14, -104.82, M],
  ["Ontario OR", 44.03, -116.96, M], ["Goodland KS", 39.35, -101.71, M], ["Dodge City KS", 37.75, -100.02, C], ["St. Francis KS", 39.78, -101.8, C],
  ["Phoenix AZ", 33.45, -112.07, AZ], ["Lake Powell (Page) AZ", 36.91, -111.46, AZ], ["Lake Havasu AZ", 34.48, -114.32, AZ],
  ["Seattle WA", 47.61, -122.33, P], ["Portland OR", 45.52, -122.68, P], ["San Francisco CA", 37.77, -122.42, P], ["Los Angeles CA", 34.05, -118.24, P],
  ["Lake Tahoe NV", 39.1, -120.0, P], ["Las Vegas NV", 36.17, -115.14, P], ["Coeur d'Alene ID", 47.68, -116.78, P],
];
places.forEach(([n, la, ln, want]) => { const got = A.tzFor(la, ln); ok(got === want, `${n} → ${want}${got === want ? "" : " (got " + got + ")"}`); });
ok(A.tzFor(30, -60) === undefined, "open sea far from the US → no zone (this phone's own zone, as before)");
ok(A.tzFor(NaN, 5) === undefined && A.tzFor(null, null) === undefined, "no location → no zone");

// ---------- 2) the clock of another zone, daylight saving, Arizona ----------
const t = new Date("2026-10-22T19:30:00Z");                 // daylight saving time everywhere except Arizona
ok(A.tzClock(t, E).replace(/\s/g, " ") === "3:30 PM", "19:30 UTC = 3:30 PM Eastern");
ok(A.tzClock(t, C).replace(/\s/g, " ") === "2:30 PM", "= 2:30 PM Central");
ok(A.tzClock(t, M).replace(/\s/g, " ") === "1:30 PM", "= 1:30 PM Mountain");
ok(A.tzClock(t, P).replace(/\s/g, " ") === "12:30 PM", "= 12:30 PM Pacific");
ok(A.tzClock(t, AZ).replace(/\s/g, " ") === "12:30 PM", "= 12:30 PM Arizona (summer: same as Pacific)");
const w = new Date("2026-12-22T19:30:00Z");                 // winter
ok(A.tzClock(w, AZ).replace(/\s/g, " ") === "12:30 PM" && A.tzClock(w, P).replace(/\s/g, " ") === "11:30 AM" && A.tzClock(w, M).replace(/\s/g, " ") === "12:30 PM",
  "in winter Arizona = Mountain, Pacific is an hour behind Arizona (no daylight saving there)");
ok(A.tzClock(t, undefined) === t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), "no zone = the phone's own clock, same text as before");
ok(A.tzClock(t, "Not/AZone") === t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), "a bad zone name falls back to the phone's clock instead of crashing");
ok(A.tzClock(t, E) === t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: E }), "Eastern text is exactly the old Eastern text");
ok(A.tzHour(new Date("2026-10-22T04:30:00Z"), P) === 21 && A.tzHour(new Date("2026-10-22T04:30:00Z"), E) === 0, "midnight Eastern is hour 0 (never 24); 9 PM the evening before in Pacific");
ok(A.tzHourLabel(new Date("2026-10-22T19:00:00Z"), P) === "12pm" && A.tzHourLabel(new Date("2026-10-22T19:00:00Z"), E) === "3pm", "hour labels follow the zone (12pm Pacific, 3pm Eastern)");
ok(A.tzDayKey(new Date("2026-10-23T03:30:00Z"), E) === "2026-10-22" && A.tzDayKey(new Date("2026-10-23T03:30:00Z"), P) === "2026-10-22" && A.tzDayKey(new Date("2026-10-23T08:30:00Z"), E) === "2026-10-23",
  "the calendar day follows the zone");
ok(A.tzDayKey(new Date("2026-10-23T05:00:00Z"), E) === "2026-10-23" && A.tzDayKey(new Date("2026-10-23T05:00:00Z"), P) === "2026-10-22", "a late Eastern evening is still the day before in Pacific");
ok(+A.tzDayStart(new Date("2026-10-22T19:30:00Z"), P) === Date.UTC(2026, 9, 22, 7), "midnight Pacific on Oct 22 = 07:00 UTC");
ok(+A.tzDayStart(new Date("2026-10-22T19:30:00Z"), E) === Date.UTC(2026, 9, 22, 4), "midnight Eastern on Oct 22 = 04:00 UTC");
ok(+A.tzDayStart(new Date("2026-10-22T19:30:00Z"), AZ) === Date.UTC(2026, 9, 22, 7), "midnight Arizona on Oct 22 = 07:00 UTC");
ok(+A.tzDayStart(new Date("2026-11-01T20:00:00Z"), P) === Date.UTC(2026, 10, 1, 7), "the day daylight saving ends: midnight Pacific is still 07:00 UTC");
ok(+A.tzDayStart(new Date("2026-11-02T20:00:00Z"), P) === Date.UTC(2026, 10, 2, 8), "and the next day it is 08:00 UTC");
ok(+A.tzDayStart(new Date("2026-03-08T20:00:00Z"), C) === Date.UTC(2026, 2, 8, 6), "the day daylight saving starts: midnight Central is 06:00 UTC");
{ const real = Date; // days from today, on that zone's calendar
  const n = new Date(); const inHours = h => new Date(n.getTime() + h * 3600000);
  ok(A.tzDayDiff(n, E) === 0 && A.tzDayDiff(inHours(30), P) >= 1 && A.tzDayDiff(inHours(30), P) <= 2 && A.tzDayDiff(inHours(-30), P) <= -1, "days from today counts calendar days in that zone"); }
ok(A.areaTz() === undefined, "areaTz is empty until the app knows where the area is (LAT/LNG)");

// ---------- 3) weather + water-temperature backup ask for the spot's own zone ----------
const s02 = read("js/02-spots.js");
ok(!/New_York|America%2F/.test(s02), "js/02 no longer hard-codes Eastern time");
const urls = [];
const c02 = { console, Math, isFinite, Date, Intl, Array, Object, Promise, encodeURIComponent, parseFloat,
  tzFor: A.tzFor, compass: () => "N", refreshConditions: () => {}, hasLoc: () => true, okTemp: v => typeof v === "number",
  erddapJson: () => Promise.reject(new Error("no")), wtSourceFor: () => null, miles: () => 0,
  fetch: u => { urls.push(String(u)); return Promise.resolve({ json: () => Promise.resolve({ current: { pressure_msl: 1013, wind_speed_10m: 5, wind_direction_10m: 90, temperature_2m: 70, sea_surface_temperature: 80 }, hourly: { pressure_msl: [1013, 1013, 1013, 1013] } }) }); } };
vm.createContext(c02);
vm.runInContext(cut(s02, "  const localWxCache", "  // ---- Water temperature ----") + "\n" + cut(s02, "  const wtNowCache", "  // Water temperature at a past moment") + "\nthis.api = { localWx, waterTempNow };", c02);
(async () => {
  const run = async (lat, lng) => { urls.length = 0; await c02.api.localWx({ lat, lng }); await c02.api.waterTempNow(lat, lng); return urls.map(u => decodeURIComponent((u.match(/timezone=([^&]*)/) || [])[1] || "")); };
  const tx = await run(29.76, -95.37);   // Galveston Bay area (Texas)
  ok(tx.length === 2 && tx.every(z => z === C), "Texas coast: weather and ocean-model backup both ask for Central (" + tx.join(", ") + ")");
  const ca = await run(37.8, -122.4);
  ok(ca.length === 2 && ca.every(z => z === P), "San Francisco: both ask for Pacific");
  const az = await run(33.45, -112.07);
  ok(az.length === 2 && az.every(z => z === AZ), "Arizona: both ask for Phoenix time (no daylight saving)");
  const fl = await run(26.24, -80.10);
  ok(fl.length === 2 && fl.every(z => z === E), "Florida (Pompano): still Eastern, same as before");
  const pan = await run(30.16, -85.66);
  ok(pan.length === 2 && pan.every(z => z === C), "Florida Panhandle (Panama City): Central");
  const sea = await run(30, -60);
  ok(sea.length === 2 && sea.every(z => z === "auto"), "far out to sea: the weather service picks the zone itself (auto)");

  // ---------- 4) the places that show times pass the spot's zone ----------
  const s01 = read("js/01-core.js"), s04 = read("js/04-insights.js"), s09 = read("js/09-map-forecast.js"), s10 = read("js/10-tools-safety.js"), s06 = read("js/06-catching.js");
  ok(/function clock\(d, tz\)/.test(s01) && /function dayName\(d, tz\)/.test(s01), "clock() and dayName() take an optional zone (none = the phone's, as before)");
  ok(/areaTz\(\)/.test(s01) && /tzDayStart\(new Date\(\), tz\)/.test(s01), "the home tide list and weather hours use the area's zone and its midnight");
  ok(/clock\(r\.next\.when, tzFor\(s\.lat, s\.lng\)\)/.test(s02), "a spot's next-tide time shows on the spot's clock");
  ok(/tzClock\(x\.when, tzFor\(s\.lat, s\.lng\)\)/.test(s04) && /tzHourLabel\(new Date\(now \+ h \* H\), tzFor\(s\.lat, s\.lng\)\)/.test(s04), "the tide graph labels follow the spot's zone");
  ok(/tzHour\(y\.t, tz\) === h/.test(s09) && /tzDayKey\(x\.t, tz\)/.test(s09) && /DAYNAME\(d\.date, tz\)/.test(s09), "the forecast bar groups days and hours by the spot's zone");
  ok(/Best around \$\{clock\(r\.best\.t, tzFor\(r\.s\.lat, r\.s\.lng\)\)\}/.test(s09), "Best spot today shows the spot's clock");
  ok(/clock\(current\.end, areaTz\(\)\)/.test(s09) && /clock\(p\.start, areaTz\(\)\)/.test(s09) && /tzDayStart\(day, areaTz\(\)\)/.test(s06), "moon / solunar times use the area's zone and day");
  ok(/clock\(nx\.when, tzFor\(here\.lat, here\.lng\)\)/.test(s10) && /clock\(at, tzFor\(here\.lat, here\.lng\)\)/.test(s10), "boat bar tide and sunset/sunrise use the boat's zone");

  // ---------- 5) games keep the New York day on purpose ----------
  ok(/timeZone: "America\/New_York"/.test(read("js/51-games.js")) && /timeZone: "America\/New_York"/.test(read("js/52-games-more.js")), "games still use the New York day");

  // ---------- 6) shown in the app ----------
  const hist = read("docs/build_history.md"), wn = read("js/13-groups-misc.js");
  ok(/time zone/i.test(wn.slice(wn.indexOf("WHATS_NEW"), wn.indexOf("WHATS_NEW") + 30000)), "What's new mentions time zones");
  ok(/v175/.test(hist), "build history has v175");
  console.log(bad ? `\n${bad} FAILED` : "\nALL OK");
  process.exit(bad ? 1 : 0);
})();
