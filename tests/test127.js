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

// D. water temperature near Jacksonville
need(wt(30.39, -81.43) && wt(30.39, -81.43).id === "8720218", "Mayport spot uses the Mayport water-temperature station");
need(wt(30.35, -81.61) && /Jacksonville University|Dames Point/.test(wt(30.35, -81.61).name), "St. Johns River spot uses a river station: " + (wt(30.35, -81.61) || {}).name);
need(wt(30.35, -81.61) && wt(30.35, -81.61).mi === 8, "river stations only speak for 8 miles");
need(wt(28.41, -80.59) === null, "Port Canaveral has no water-temperature station (Trident Pier gives no data), so it falls back to the ocean model");
need(!WT_STATIONS.some(t => t.id === "8721604" || t.id === "8720030"), "Trident Pier and Fernandina Beach are not in the water-temperature list");

console.log(bad ? "FAIL:" + bad : "OK");
process.exit(bad ? 1 : 0);
