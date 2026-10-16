// Sprint #6 step 2: red no-fishing warning in Home (best spots), Find new water, Plan a trip (js/33 zoneRow + the places that call it)
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const rows = JSON.parse(fs.readFileSync(path.join(__dirname, "protected-zones.json"), "utf8"));

const mk = (tag, cls, text) => ({ tag, className: cls || "", textContent: text || "", children: [], attrs: {}, hidden: false, handlers: {},
  appendChild(c) { this.children.push(c); return c; }, setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(t, f) { this.handlers[t] = f; } });
const nodes = { "boat-zone": mk("div"), "qc-zone": mk("div"), "spot-list": mk("div") };
const store = {};
const ctx = { console, Date, JSON, Math, isFinite, Array, Object, $: id => nodes[id], el: mk, me: { id: "u1" }, fmtDist: mi => mi.toFixed(1) + " mi",
  localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } },
  db: { from: () => ({ select: () => ({ limit: async () => ({ data: rows, error: null }) }) }) }, boat: { pos: null }, qc: { pos: null } };
vm.createContext(ctx);
vm.runInContext(read("js/33-zones.js") + "\nthis.api = { zoneRow, zoneChip, zn };", ctx);
const A = ctx.api; A.zn.read = true; A.zn.rows = rows; A.zn.t = Date.now();

const inZone = { lat: 24.54825, lng: -81.4057 }, outside = { lat: 26.24, lng: -80.12 };

// zoneRow: a line of its own holding the red chip
const r1 = A.zoneRow({ id: "a", name: "Spot A", ...inZone });
ok(r1 && r1.className === "chips" && r1.children.length === 1 && /zone-chip in/.test(r1.children[0].children[0].className), "a spot inside a zone gets a 'chips' line with the red chip");
ok(A.zoneRow({ id: "b", name: "Spot B", ...outside }) === null, "a spot far from any zone gets nothing");
ok(A.zoneRow({ id: "c", name: "Spot C", ...inZone, is_exact: false }) === null, "a blurred pin is never flagged");

// suggestions have a `key`, not an `id`: each one must keep its own open/closed state
const s1 = A.zoneRow({ key: "osm:1", name: "Pier 1", ...inZone }), s2 = A.zoneRow({ key: "osm:2", name: "Pier 2", ...inZone });
const b1 = s1.children[0].children[0], m1 = s1.children[0].children[1], m2 = s2.children[0].children[1];
b1.handlers.click();
ok(m1.hidden === false && m2.hidden === true, "opening one suggestion's warning does not open another's");
ok(A.zoneRow({ name: "No id no key", ...inZone }) !== null, "a suggestion with no id or key still gets its warning");

// the warning only flags: the three screens add the line but never filter on it
const best = read("js/09-map-forecast.js"), plan = read("js/08-feed-plans.js"), zones = read("js/33-zones.js"), html = read("index.html");
const fnBody = (src, name) => { const i = src.indexOf("function " + name); return i < 0 ? "" : src.slice(i, i + 6000); };
ok(/zoneRow\(r\.s\)/.test(fnBody(best, "renderBest()").split("function refreshConditions")[0]), "Home: Best spots today rows call zoneRow");
ok(/zoneRow\(g\)/.test(fnBody(best, "renderSuggestions()").split("$(\"sugg-more\").addEventListener")[0]), "Find new water: suggestion rows call zoneRow");
ok(/zoneRow\(r\.s\)/.test(fnBody(plan, "planSuggest()").split("[\"pl-date\", \"pl-time\"]")[0]), "Plan a trip: suggested spots call zoneRow");
ok(/function planZone\(\)/.test(plan) && /planZone\(\);\s*\n\s*const dup = similarPlans/.test(plan) && /id="pl-zone"/.test(html), "Plan a trip: the chosen spot gets a warning under Where (planZone, #pl-zone)");
ok(!/zone.*\.filter\(|\.filter\([^)]*zone/i.test(fnBody(best, "renderBest()").split("function refreshConditions")[0] + fnBody(best, "renderSuggestions()").split("$(\"sugg-more\").addEventListener")[0] + fnBody(plan, "planSuggest()").split("[\"pl-date\", \"pl-time\"]")[0]), "flag, don't hide: no zone-based filtering in those lists");
ok(/renderBest\(\)/.test(zones) && /renderSuggestions\(\)/.test(zones) && /planSuggest\(\)/.test(zones), "lists redraw when the zone list arrives (znChanged)");
ok(/id="pl-zone"/.test(html) && html.indexOf('id="pl-zone"') < html.indexOf('id="pl-map"'), "#pl-zone sits right under the spot picker");

ok(zones.includes("if (zn.t && Date.now() - zn.t < ZN.age) return null") && zones.includes("const changed = (data || []).length !== zn.rows.length"), "an empty zone list is not asked for again on every redraw (no endless redraw loop)");
console.log(bad ? "FAILED" : "OK"); process.exit(bad ? 1 : 0);
