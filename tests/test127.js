// test127: Atlantic coast tide + water-temperature stations (sprint #4, statewide data).
// Reads the station lists straight out of js/02-spots.js, so no fake app is needed.
const fs = require("fs");
const vm = require("vm");
const src = fs.readFileSync(require("path").join(__dirname, "..", "js", "02-spots.js"), "utf8");
function grab(name) {
  const start = src.indexOf("const " + name + " = [");
  if (start < 0) throw new Error("cannot find " + name);
  const end = src.indexOf("\n  ];", start);
  return src.slice(start, end + 5);
}
const milesFn = (() => { const s = src.indexOf("function miles("); return src.slice(s, src.indexOf("\n  }", s) + 4); })();
const ctx = vm.createContext({});
vm.runInContext(milesFn + "\n" + grab("TIDE_STATIONS") + "\n" + grab("WT_STATIONS") + "\nthis.out = { TIDE_STATIONS, WT_STATIONS, miles };", ctx);
const { TIDE_STATIONS, WT_STATIONS, miles } = ctx.out;
let bad = "";
const need = (c, m) => { if (!c) { bad += "\n  ✗ " + m; console.log("FAIL:", m); } };
const nearTide = (lat, lng) => TIDE_STATIONS.map(t => ({ ...t, dist: miles(lat, lng, t.lat, t.lng) })).sort((a, b) => a.dist - b.dist)[0];
const wt = (lat, lng) => WT_STATIONS.map(t => ({ ...t, dist: miles(lat, lng, t.lat, t.lng) })).filter(t => t.dist <= (t.mi || 20)).sort((a, b) => a.dist - b.dist)[0] || null;

// A. the lists are sane
const ids = TIDE_STATIONS.map(t => t.id);
need(new Set(ids).size === ids.length, "no duplicate tide station ids");
need(ids.every(i => /^\d{7}$/.test(i)), "every tide station id is 7 digits");
need(TIDE_STATIONS.every(t => t.name && t.lat > 24.3 && t.lat < 31.1 && t.lng > -87.8 && t.lng < -79.8), "every tide station is inside Florida with a name");
const wids = WT_STATIONS.map(t => t.id);
need(new Set(wids).size === wids.length, "no duplicate water-temperature station ids");
need(wids[0] === "8722670" && wids[1] === "8723214", "Lake Worth Pier and Virginia Key stay first in the water-temperature list (js/13 relies on it)");
for (const id of ["8720218", "8720219"]) {
  const a = WT_STATIONS.find(t => t.id === id), b = TIDE_STATIONS.find(t => t.id === id);
  need(a && b && miles(a.lat, a.lng, b.lat, b.lng) < 0.1, "Jacksonville water station " + id + " sits where the tide list puts it");
}
need(WT_STATIONS.some(t => t.id === "8720245"), "Jacksonville University (river) is in the water-temperature list");

// B. the Atlantic gap is filled
const atl = TIDE_STATIONS.filter(t => t.lat > 27.1 && t.lng > -81.8 && t.lng < -79.9);
need(atl.length >= 100, "100+ Atlantic-coast stations north of St. Lucie Inlet: " + atl.length);
const cases = [
  ["Jacksonville Beach pier", 30.285, -81.386, /Jacksonville Beach/, 3],
  ["St. Augustine", 29.89, -81.31, /St\. Augustine/, 3],
  ["Daytona Beach", 29.15, -80.96, /Daytona/, 3],
  ["Fort Pierce Inlet", 27.47, -80.29, /Fort Pierce/, 3],
  ["Sebastian Inlet", 27.86, -80.45, /Sebastian/, 3],
  ["Fernandina Beach", 30.67, -81.46, /Fernandina/, 3]
];
for (const [label, lat, lng, re, max] of cases) {
  const s = nearTide(lat, lng);
  need(re.test(s.name) && s.dist <= max, label + " → " + s.name + " (" + s.dist.toFixed(1) + " mi)");
}

// C. nothing changed for the home waters
need(nearTide(26.257, -80.081).id === "8722859" || /Hillsboro/.test(nearTide(26.257, -80.081).name), "Hillsboro Inlet still uses a Hillsboro station: " + nearTide(26.257, -80.081).name);
need(nearTide(27.77, -82.63).id === "8726520" || /Petersburg|Pinellas|Tampa/.test(nearTide(27.77, -82.63).name), "Tampa Bay unchanged: " + nearTide(27.77, -82.63).name);
need(wt(26.24, -80.10) === null, "Pompano still has no built-in water-temperature station close enough (ocean estimate): " + JSON.stringify(wt(26.24, -80.10)));

// B2. the Panhandle is filled in too (Steinhatchee to the Alabama line)
const pan = TIDE_STATIONS.filter(t => t.lng < -83.3 && t.lat > 29.5);
need(pan.length >= 80, "80+ Panhandle stations west of Steinhatchee: " + pan.length);
const pcases = [
  ["Pensacola Beach", 30.33, -87.14, /Pensacola Beach Pier/, 2],
  ["Pensacola Bay", 30.41, -87.21, /^Pensacola$/, 2],
  ["Perdido Key", 30.39, -87.43, /Blue Angels Park|Nix Point/, 3],
  ["Destin", 30.39, -86.51, /East Pass/, 2],
  ["Panama City Beach", 30.21, -85.88, /Panama City Beach/, 2],
  ["Port St. Joe", 29.81, -85.31, /Port Saint Joe/, 2],
  ["Apalachicola", 29.72, -84.98, /^Apalachicola$/, 2],
  ["Carrabelle", 29.85, -84.66, /Carrabelle/, 3],
  ["St. Marks", 30.15, -84.20, /St\. Marks/, 3],
  ["Steinhatchee", 29.67, -83.39, /Steinhatchee/, 3]
];
for (const [label, lat, lng, re, max] of pcases) {
  const s = nearTide(lat, lng);
  need(re.test(s.name) && s.dist <= max, label + " → " + s.name + " (" + s.dist.toFixed(1) + " mi)");
}
need(/Horseshoe Point|Steinhatchee/.test(nearTide(29.5, -83.33).name), "the Big Bend joins up with the old Gulf list near Horseshoe Point: " + nearTide(29.5, -83.33).name);

// D. water temperature near Jacksonville
need(wt(30.39, -81.43) && wt(30.39, -81.43).id === "8720218", "Mayport spot uses the Mayport water-temperature station");
need(wt(30.35, -81.61) && /Jacksonville University|Dames Point/.test(wt(30.35, -81.61).name), "St. Johns River spot uses a river station: " + (wt(30.35, -81.61) || {}).name);
need(wt(30.35, -81.61) && wt(30.35, -81.61).mi === 8, "river stations only speak for 8 miles");
need(wt(28.41, -80.59) === null, "Port Canaveral has no water-temperature station (Trident Pier gives no data), so it falls back to the ocean model");
need(!WT_STATIONS.some(t => t.id === "8721604" || t.id === "8720030"), "Trident Pier and Fernandina Beach are not in the water-temperature list");

// E. water temperature in the Panhandle
need((wt(30.40, -87.21) || {}).id === "8729840", "Pensacola Bay spot uses the Pensacola station: " + (wt(30.40, -87.21) || {}).name);
need((wt(30.22, -85.87) || {}).id === "8729210", "Panama City Beach spot uses the Panama City Beach pier station");
need((wt(30.14, -85.66) || {}).id === "8729108", "St. Andrew Bay spot uses the Panama City station");
need((wt(29.72, -84.99) || {}).id === "8728690", "Apalachicola Bay spot uses the Apalachicola station");
need(wt(30.39, -86.51) === null, "Destin has no water-temperature station (Panama City Beach and Pensacola are too far) → ocean model");
need(wt(30.33, -87.14) === null || wt(30.33, -87.14).id === "8729840", "Pensacola Beach (about 7 mi from the bay station): " + JSON.stringify((wt(30.33, -87.14) || {}).id));

console.log(bad ? "FAIL:" + bad : "OK");
process.exit(bad ? 1 : 0);
