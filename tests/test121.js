// Gulf step 8: no-fishing zones check (js/33-zones.js) — real zone shapes from the live database (tests/protected-zones.json)
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const rows = JSON.parse(fs.readFileSync(path.join(__dirname, "protected-zones.json"), "utf8"));
const byName = n => rows.find(r => r.name.startsWith(n));

// a tiny fake page
const mk = (tag, cls, text) => ({ tag, className: cls || "", textContent: text || "", children: [], attrs: {}, hidden: false, handlers: {},
  appendChild(c) { this.children.push(c); return c; }, setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(t, f) { this.handlers[t] = f; } });
const nodes = { "boat-zone": mk("div"), "qc-zone": mk("div"), "spot-list": mk("div") };
const store = {}; let asked = 0, dbMode = "ok";
const ctx = {
  console, Date, JSON, Math, isFinite, Array, Object,
  $: id => nodes[id], el: mk, me: { id: "u1" }, fmtDist: mi => mi < 0.2 ? Math.round(mi * 5280) + " ft" : mi.toFixed(1) + " mi",
  localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } },
  db: { from: t => ({ select: () => ({ limit: async () => { asked++; return dbMode === "ok" ? { data: rows, error: null } : { data: null, error: { message: "offline" } }; } }) }) },
  boat: { pos: null }, qc: { pos: null }
};
vm.createContext(ctx);
vm.runInContext(read("js/33-zones.js") + "\nthis.api = { zoneAt, znLine, znDetails, zoneChip, zonesEnsure, znBoatRender, znQcRender, zn, ZN, znGeomHas };", ctx);
const A = ctx.api;
A.zn.read = true; A.zn.rows = rows; A.zn.t = Date.now();   // pretend the list is already on the phone

// a point inside a shape, found by searching its box
const findInside = r => { for (let i = 1; i < 60; i++) for (let j = 1; j < 60; j++) {
  const lat = r.min_lat + (r.max_lat - r.min_lat) * i / 60, lng = r.min_lng + (r.max_lng - r.min_lng) * j / 60;
  if (A.znGeomHas(r.geom, lng, lat)) return { lat, lng }; } return null; };

// inside / near / outside
const looe = byName("Looe Key"), pt = { lat: 24.54825, lng: -81.4057 };
let h = A.zoneAt(pt.lat, pt.lng);
ok(h.inside && h.inside.name === looe.name && !h.near, "a point in Looe Key's sanctuary area is inside it");
ok(/^🚫 Looe Key Sanctuary Preservation Area — fishing is not allowed$/.test(A.znLine(h)), "no-fishing wording: " + A.znLine(h));
h = A.zoneAt(24.60, -81.30);
ok(!h.inside && !h.near && A.znLine(h) === "", "2+ miles away: nothing to say");
const sand = byName("Sand Key");
h = A.zoneAt(24.455, -81.8685);
ok(!h.inside && h.near && h.near.row.name === sand.name && h.near.mi > 0.1 && h.near.mi < 0.3, "a boat just outside Sand Key is 'near' (" + (h.near && h.near.mi.toFixed(2)) + " mi)");
ok(/^⚠️ (\d+ ft|\d\.\d mi) from Sand Key Sanctuary Preservation Area \(fishing is not allowed\)$/.test(A.znLine(h)), "near wording: " + A.znLine(h));
ok(!A.zoneAt(24.455, -81.8685, 0.1).near, "a smaller 'near' distance leaves it out");
const west = A.zoneAt(24.518, -81.706);
ok(west.inside && west.inside.name === "Western Sambo Ecological Reserve", "Western Sambo Ecological Reserve");
const hen = findInside(byName("Henderson"));
ok(hen && A.zoneAt(hen.lat, hen.lng).inside.level === "no_entry" && /closed to the public/.test(A.znLine(A.zoneAt(hen.lat, hen.lng))), "a manatee no-entry zone says 'closed to the public'");
ok(A.zoneAt(26.24, -80.12).inside === null && A.zoneAt(26.24, -80.12).near === null, "Pompano Beach: nothing near");
ok(A.zoneAt(NaN, 1).inside === null, "no position: no answer");

// holes: Dry Tortugas Research Natural Area has a cut-out ring
ok(A.zoneAt(24.63, -82.93).inside && A.zoneAt(24.63, -82.93).inside.name.startsWith("Dry Tortugas"), "inside the Dry Tortugas area's outer edge");
ok(!A.zoneAt(24.627, -82.87, 0.2).inside, "inside its cut-out ring = not inside");

// overlapping shapes: the smaller wins
const big = { id: 100, name: "Big area", level: "no_entry", min_lat: 0, max_lat: 10, min_lng: 0, max_lng: 10, geom: { type: "Polygon", coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] } };
const small = { id: 101, name: "Small area", level: "no_fishing", min_lat: 4, max_lat: 6, min_lng: 4, max_lng: 6, geom: { type: "Polygon", coordinates: [[[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]] } };
ok(A.zoneAt(5, 5, 0.5, [big, small]).inside.name === "Small area" && A.zoneAt(1, 1, 0.5, [big, small]).inside.name === "Big area", "overlapping zones: the most specific one is reported");
const multi = { id: 102, name: "Two islands", level: "no_fishing", min_lat: 0, max_lat: 3, min_lng: 0, max_lng: 3, geom: { type: "MultiPolygon", coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]], [[[2, 2], [3, 2], [3, 3], [2, 3], [2, 2]]]] } };
ok(A.zoneAt(0.5, 0.5, 0.1, [multi]).inside && A.zoneAt(2.5, 2.5, 0.1, [multi]).inside && !A.zoneAt(1.5, 1.5, 0.1, [multi]).inside, "MultiPolygon: either piece counts, the gap between does not");

// details
const d = A.znDetails(looe), txt = JSON.stringify(d);
ok(/No fishing/.test(txt) && /Looe Key Sanctuary/.test(txt) && /floridakeys\.noaa\.gov/.test(txt) && /Areas not on this list can still have rules/.test(txt), "details name the area, the rule, the link and the limits of the list");
ok(!/Unrestricted/.test(txt), "'Unrestricted' anchoring isn't repeated as a restriction");

// spot cards
const chip = A.zoneChip({ id: 7, lat: pt.lat, lng: pt.lng });
ok(chip && chip.children[0].className.includes("zone-chip in") && /🚫 Looe Key/.test(chip.children[0].textContent), "a spot inside a zone gets a red chip");
ok(chip.children[1].hidden === true && chip.children[0].attrs["aria-expanded"] === "false", "details start closed");
chip.children[0].handlers.click();
ok(chip.children[1].hidden === false && chip.children[0].attrs["aria-expanded"] === "true", "tap opens the details");
ok(A.zoneChip({ id: 8, lat: pt.lat, lng: pt.lng, is_exact: false }) === null, "a blurred (approximate) pin is never checked");
ok(A.zoneChip({ id: 9, lat: 26.24, lng: -80.12 }) === null && A.zoneChip({ id: 10, lat: null, lng: null }) === null, "far away or no position: no chip");
const nearChip = A.zoneChip({ id: 11, lat: 24.455, lng: -81.8685 });
ok(nearChip && !nearChip.children[0].className.includes(" in") && /⚠️/.test(nearChip.children[0].textContent), "a spot just outside gets the softer chip");

// Boat mode
ctx.boat.pos = { lat: pt.lat, lng: pt.lng, t: Date.now() }; A.znBoatRender();
ok(!nodes["boat-zone"].hidden && nodes["boat-zone"].className === "urgent" && /🚫/.test(nodes["boat-zone"].textContent), "Boat mode: red line while inside");
ctx.boat.pos = { lat: 24.455, lng: -81.8685, t: Date.now() }; A.znBoatRender();
ok(!nodes["boat-zone"].hidden && nodes["boat-zone"].className === "" && /⚠️/.test(nodes["boat-zone"].textContent), "Boat mode: amber heads-up when close");
ctx.boat.pos = { lat: 26.24, lng: -80.12, t: Date.now() }; A.znBoatRender();
ok(nodes["boat-zone"].hidden === true, "Boat mode: nothing shown when clear");
ctx.boat.pos = { lat: pt.lat, lng: pt.lng, t: Date.now() - 60000 }; A.znBoatRender();
ok(nodes["boat-zone"].hidden === true, "Boat mode: an old GPS fix is not used");

// Quick catch
ctx.qc.pos = { lat: pt.lat, lng: pt.lng }; A.znQcRender();
ok(!nodes["qc-zone"].hidden && nodes["qc-zone"].className === "zone-warn in" && /Looe Key/.test(nodes["qc-zone"].textContent), "Quick catch: warning under the place line");
ctx.qc.pos = null; A.znQcRender();
ok(nodes["qc-zone"].hidden === true, "Quick catch: hidden with no position");

// the phone's copy
(async () => {
  A.zn.rows = []; A.zn.t = 0; A.zn.read = false; asked = 0; Object.keys(store).forEach(k => delete store[k]);
  await A.zonesEnsure();
  ok(asked === 1 && A.zn.rows.length === rows.length && JSON.parse(store["fm-zones-v1"]).rows.length === rows.length, "first time: asks the database once and keeps a copy on the phone");
  A.zn.rows = []; A.zn.read = false; A.zn.t = 0;    // a new visit: the copy on the phone is read first
  await A.zonesEnsure();
  ok(asked === 1 && A.zn.rows.length === rows.length, "next visit within a week: uses the phone's copy, no new request");
  const old = JSON.parse(store["fm-zones-v1"]); old.t = Date.now() - 8 * 86400000; store["fm-zones-v1"] = JSON.stringify(old);
  A.zn.rows = []; A.zn.read = false; A.zn.t = 0; dbMode = "down";
  await A.zonesEnsure();
  ok(asked === 2 && A.zn.rows.length === rows.length, "a week old + database unreachable: the old copy keeps working");
  await A.zonesEnsure();
  ok(asked === 2, "after a failure it waits before asking again");

  // the map popup reads the inventory's own column names
  const nine = read("js/09-map-forecast.js");
  const pop = nine.slice(nine.indexOf("  function zonePopup(p) {"), nine.indexOf("  function mxRefresh()"));
  let shown = null;
  const pctx = { mxVal: v => v == null || v === "" || v === " " ? null : String(v).trim(), mxPopup: (t, r) => { shown = { t, r: Object.fromEntries(r.filter(x => x[1]).map(x => [x[0], x[1]])) }; return mk("div"); }, el: mk, Object, String };
  vm.createContext(pctx); vm.runInContext(pop + "\nthis.zonePopup = zonePopup;", pctx);
  pctx.zonePopup({ Site_Name: "Looe Key Sanctuary Preservation Area", Prot_Lvl: "No Take", Fish_Rstr: "Commercial and Recreational Fishing Prohibited", Mgmt_Agen: "NOAA", Gov_Level: "Federal", Anchor: "Unrestricted", Vessel: " ", URL: "https://floridakeys.noaa.gov/" });
  ok(shown.t.includes("Looe Key") && shown.r["Fishing rules"] === "Commercial and Recreational Fishing Prohibited" && shown.r["Level of protection"] === "No Take" && shown.r["Managed by"] === "NOAA", "map popup: fishing rules, protection level (not 'Gov_Level') and agency are found");
  ok(!("Anchoring" in shown.r) && !("Boats" in shown.r), "map popup: blank / unrestricted anchoring and boats are left out");
  pctx.zonePopup({ Site_Name: "Test No-Take Zone", Fishing_Restriction: "No Take" });
  ok(shown.r["Fishing rules"] === "No Take", "map popup: older column names still work");

  // wiring
  const html = read("index.html"), sw = read("sw.js"), six = read("js/06-catching.js"), ten = read("js/10-tools-safety.js");
  ok(/<script src="js\/33-zones\.js\?v=\d+"><\/script>/.test(html) && html.indexOf("js/33-zones.js") < html.indexOf("js/99-boot.js") && html.indexOf("js/33-zones.js") > html.indexOf("js/32-spot-style.js"), "script tag sits before the boot file");
  ok(/id="boat-zone"/.test(html) && /id="qc-zone"/.test(html), "Boat mode and Quick catch have their zone line");
  ok(sw.includes("./js/33-zones.js"), "service worker keeps the file for offline");
  ok(/znBoatRender/.test(ten) && /znQcRender/.test(six) && /zoneChip\(s\)/.test(nine) && /znDraw\(\)/.test(nine) && /znUndraw/.test(nine), "spot cards, Boat mode, Quick catch and the map call the check");
  ok(!/oceandata\.rad\.rutgers/.test(nine), "the dead NOAA backup server is no longer asked");
  ok(fs.existsSync(path.join(root, "setup/65-protected-zones.sql")) && /create table if not exists public\.protected_zones/.test(read("setup/65-protected-zones.sql")), "setup/65 is saved");
  console.log(bad ? "\n" + bad + " FAILED" : "\nall ok");
  process.exit(bad ? 1 : 0);
})();
