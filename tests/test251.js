// test251: weather plan step 10 (v270) — marine alerts (js/81): the nearest NWS coastal marine zone for a place (the place itself, else
// 4 then 12 miles out in 8 directions; lakes = the place only; kept on the phone), its alerts (Small Craft Advisory, Gale…) join the
// Home alerts line and the Shore/Boat verdicts (Home chips + Weather screen), rip current statements feed the Rip currents tile; US only.
process.env.TZ = "America/New_York";
const { JSDOM } = require("jsdom");
const fs = require("fs");
const sun = fs.readFileSync(require.resolve("suncalc"), "utf8");
const leaf = fs.readFileSync(require.resolve("leaflet/dist/leaflet.js"), "utf8");
const html = require("./load")();
const ME = "u-sam";
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPOTS = [{ id: "s1", name: "Pompano Pier", spot_type: "pier", water_type: "saltwater", lat: 26.232, lng: -80.088, created_by: ME, visibility: "private", is_exact: true, tide_offset_min: 60, faces_deg: 90 },
  { id: "s3", name: "Thames Steps", spot_type: "shore", water_type: "saltwater", lat: 51.5, lng: -0.12, created_by: ME, visibility: "private", is_exact: true },
  { id: "s2", name: "Lake Ida", spot_type: "shore", water_type: "freshwater", lat: 26.47, lng: -80.08, created_by: "other", visibility: "public", is_exact: true }];
const START = { member: { email: "sam@x.com", display_name: "Sam", is_admin: false, is_owner: false, status: "approved", terms_version: 1 }, me_extras: null, home_waters: null, app_prefs: null,
  tutorials: [], unread: 0, blocks: [], follows: [], notif_welcomed: { welcomed_at: "2026-01-01" }, hidden_spots: [], licenses: [], shares: [], picks: [],
  friendships: [], friends_accepted: [], float_plans: [], tackle: [], tournaments: [], tournament_members: [], hall_of_fame: [],
  notifications: [], trip_plans: [], trip_plan_rsvps: [], rules_ver: "v1" };

const H = 3600000, T0 = Math.floor(Date.now() / H) * H;
const MID = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return +d; })();   // today's local midnight (TZ = New York)
const DAYS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => { const d = new Date(MID); d.setDate(d.getDate() + k); return +d; });
const hoursT = []; for (let i = -12; i < 48; i++) hoursT.push((T0 + i * H) / 1000);
const arr = f => hoursT.map((t, i) => f(i));
const FC = url => ({ timezone: /latitude=51\./.test(url || "") ? "Europe/London" : "America/New_York",
  current: { time: T0 / 1000, temperature_2m: 78.4, apparent_temperature: 81.2, weather_code: 2, cloud_cover: 40, wind_speed_10m: 8, wind_gusts_10m: 12, wind_direction_10m: 92, pressure_msl: 1016.5, is_day: 1 },
  hourly_units: { visibility: "m" },
  hourly: { time: hoursT, temperature_2m: arr(i => 70 + i / 5), apparent_temperature: arr(i => 72 + i / 5), weather_code: arr(() => 2), precipitation_probability: arr(() => 10),
    wind_speed_10m: arr(() => 8), wind_gusts_10m: arr(() => 12), wind_direction_10m: arr(() => 90), pressure_msl: arr(i => 1020 - i * 0.5), uv_index: arr(i => { const hr = new Date(hoursT[i] * 1000).getHours(); return hr >= 10 && hr < 16 ? 6.2 : 0.5; }), visibility: arr(() => 16093), is_day: arr(() => 1) },
  daily: { time: DAYS.map(t => t / 1000), weather_code: [2, 61, 0, 0, 3, 3, 2, 0, 0, 95], temperature_2m_max: [82, 80, 79, 78, 81, 83, 84, 80, 77, 76], temperature_2m_min: [72, 70, 66, 65, 68, 70, 71, 69, 64, 63],
    precipitation_probability_max: [20, 70, 10, 0, 5, 5, 15, 0, 0, 60], wind_speed_10m_max: [16, 30, 8, 6, 12, 12, 14, 9, 9, 20], wind_gusts_10m_max: [22, 40, 12, 10, 18, 18, 20, 14, 14, 30], wind_direction_10m_dominant: [90, 45, 0, 315, 90, 90, 100, 0, 0, 200],
    uv_index_max: Array(10).fill(7), sunrise: Array(10).fill(null), sunset: Array(10).fill(null) } });
const MAR = () => { const mt = hoursT.slice(12), m = v => mt.map(() => v);
  return { hourly_units: { wave_height: "m", swell_wave_height: "m" }, hourly: { time: mt, wave_height: m(1.4), wave_period: m(7), wave_direction: m(95), swell_wave_height: m(0.6), swell_wave_period: m(11), swell_wave_direction: m(45), sea_surface_temperature: m(77) },
    daily: { time: [], wave_height_max: [] } }; };

async function open(wxDown, tideDown, nwsDown) {
  const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://example.org/fishing-map/", beforeParse(w) {
    w.eval(sun); w.Element.prototype.scrollIntoView = () => {};
    const rows = t => t === "spots_visible" || t === "spots" ? SPOTS : [];
    const chain = t => { const p = () => Promise.resolve({ data: rows(t), error: null, count: 0 });
      const o = {}; ["eq", "is", "in", "or", "ilike", "gte", "lte", "gt", "lt", "neq", "order", "select", "not", "contains", "match", "filter", "overlaps", "limit"].forEach(k => { o[k] = () => o; });
      o.range = () => p(); o.single = () => Promise.resolve({ data: null, error: null }); o.maybeSingle = () => Promise.resolve({ data: t === "members" ? START.member : null, error: null });
      o.then = (a, b) => p().then(a, b); return o; };
    w.supabase = { createClient: () => ({
      auth: { getSession: async () => ({ data: { session: { user: { id: ME, email: "sam@x.com", user_metadata: {} } } } }), onAuthStateChange: () => {}, signOut: async () => {} },
      rpc: async fn => fn === "ensure_profile" ? { data: { user_id: ME, handle: "sam", display_name: "Sam" }, error: null } : fn === "app_start" ? { data: JSON.parse(JSON.stringify(START)), error: null } : { data: null, error: null },
      channel: () => { const c = { on: () => c, subscribe: () => c }; return c; }, removeChannel: () => {},
      storage: { from: () => ({ createSignedUrls: async () => ({ data: [] }), createSignedUrl: async () => ({ data: null }), list: async () => ({ data: [] }) }) },
      from: t => ({ select: () => chain(t), delete: () => chain(t), insert: () => chain(t), upsert: () => Promise.resolve({ error: null }), update: () => chain(t) }) }) };
    w.__zones = []; w.__zal = []; w.__pal = []; w.__marineAlerts = [{ id: "m1", event: "Small Craft Advisory" }]; w.__pointAlerts = []; w.__nwsDown = !!nwsDown;
    w.__wx = []; w.__more = []; w.__tide = []; w.__nws = []; w.__wt = [];
    w.fetch = async url => {
      url = String(url);
      if (/api\.open-meteo\.com\/v1\/forecast/.test(url) && /forecast_days=10/.test(url) && !/current=/.test(url)) {   // the 10 days of hours (js/80), only when a far day is tapped
        w.__more.push(url);
        if (wxDown) throw new Error("offline");
        const t = []; for (let i = 0; i < 240; i++) t.push((MID + i * H) / 1000);
        const a = f => t.map((x, i) => f(i));
        return { ok: true, json: async () => ({ hourly: { time: t, temperature_2m: a(i => 60 + (i % 24)), weather_code: a(() => 1), precipitation_probability: a(() => 40), wind_speed_10m: a(() => 11), wind_gusts_10m: a(() => 15), wind_direction_10m: a(() => 180), is_day: a(i => (i % 24) > 6 && (i % 24) < 18 ? 1 : 0) } }) };
      }
      if (/open-meteo\.com\/v1\/(forecast|marine)/.test(url) && /forecast_days=10/.test(url)) {
        w.__wx.push(url);
        if (wxDown) throw new Error("offline");
        return { ok: true, json: async () => (/marine-api/.test(url) ? MAR() : FC(url)) };
      }
      if (/tidesandcurrents.*product=predictions/.test(url) && /interval=hilo/.test(url)) {
        w.__tide.push(url);
        const g = t => new Date(t).toISOString().slice(0, 16).replace("T", " ");
        if (tideDown) throw new Error("offline");
        // 11 days, a high and low every ~6 h; the swing grows each day (day k: high 1.5 + k*0.2 ft)
        const P = []; for (let k = -24; k < 264; k += 6) { const day = Math.floor((k + 24) / 24), hi = (k / 6) % 2 === 0; P.push({ t: g(MID + k * H + 30 * 60000), v: hi ? (1.5 + day * 0.2).toFixed(1) : "0.2", type: hi ? "H" : "L" }); }
        return { ok: true, json: async () => ({ predictions: P }) };
      }
      if (/marine-api.*current=sea_surface_temperature/.test(url)) { w.__wt.push(url); return { ok: true, json: async () => ({ current: { sea_surface_temperature: 78.1 } }) }; }
      if (/api\.weather\.gov\/(points|stations)/.test(url)) w.__nws.push(url);
      if (/api\.weather\.gov\/stations\/KPMP\/observations/.test(url)) {
        // hourly readings for the last 12 h, falling from 30.20 to 30.02 inHg (in pascals, like the NWS)
        const f = []; for (let k = 12; k >= 0; k--) f.push({ properties: { timestamp: new Date(Date.now() - k * H - 5 * 60000).toISOString(), barometricPressure: { value: (30.02 + k * 0.015) * 3386.39 } } });
        return { ok: true, json: async () => ({ features: f }) };
      }
      if (/api\.weather\.gov\/zones\?type=coastal/.test(url)) {
        w.__zones.push(url);
        if (w.__nwsDown) throw new Error("offline");
        const m = url.match(/point=([-\d.]+),([-\d.]+)/), la = +m[1], lo = +m[2];
        // the ocean off Pompano: east of -80.075 and south of 26.4 = AMZ651
        const f = lo > -80.075 && la < 26.4 && la > 26.0 ? [{ properties: { id: "AMZ651", type: "coastal", name: "Coastal waters from Jupiter Inlet to Deerfield Beach FL out 20 NM" } }] : [];
        return { ok: true, json: async () => ({ features: f }) };
      }
      if (/api\.weather\.gov\/alerts\/active\?zone=/.test(url)) {
        w.__zal.push(url);
        if (w.__nwsDown) throw new Error("offline");
        return { ok: true, json: async () => ({ features: w.__marineAlerts.map(a => ({ properties: Object.assign({ geocode: { UGC: ["AMZ651"] }, description: "Northeast winds 20 to 25 knots. Seas 5 to 7 feet.", ends: new Date(Date.now() + 9 * H).toISOString() }, a) })) }) };
      }
      if (/api\.weather\.gov\/alerts\/active\?point=/.test(url)) {
        w.__pal.push(url);
        if (w.__nwsDown) throw new Error("offline");
        return { ok: true, json: async () => ({ features: w.__pointAlerts.map(a => ({ properties: Object.assign({ areaDesc: "Coastal Broward County" }, a) })) }) };
      }
      return { ok: true, json: async () => ({ properties: {}, features: [], elements: [], results: [], items: [] }) };
    };
  }});
  const w = dom.window; w.scrollTo = () => {}; w.requestAnimationFrame = f => setTimeout(f, 16); w.SVGSVGElement.prototype.createSVGRect = () => ({}); w.eval(leaf);
  await wait(4500);
  return w;
}


(async () => {
  let w = await open();
  const $ = id => w.document.getElementById(id), txt = id => ($(id) ? $(id).textContent : "");
  // Home: the marine zone's Small Craft Advisory joins the alerts line
  ok(w.__zones.length >= 1 && w.__zal.some(u => /zone=AMZ651$/.test(u)), "at start: marine zone found, its alerts asked (" + w.__zones.length + " zone looks)");
  const sca = w.eval("wx.list").find(a => a.event === "Small Craft Advisory");
  ok(sca && sca.marine && /Jupiter Inlet to Deerfield Beach/.test(sca.area), "Home alert list has the Small Craft Advisory, marked marine, with the zone name");
  ok(/1 alert/.test(txt("hn-alerts")) && /small craft advisory/i.test(txt("hn-alerts")), "Home alerts line: " + txt("hn-alerts"));
  ok([...$("wx-banner").querySelectorAll(".wx-item b")].some(b => /^⚓ Small Craft Advisory/.test(b.textContent)), "…listed with an anchor in the alerts list");
  ok(/Boat\s*Hard/.test(txt("hn-wx-go")) && /Shore\s*Good/.test(txt("hn-wx-go")), "Home chips: Boat Hard (advisory), Shore Good: " + txt("hn-wx-go"));
  // zone finder
  const zones = w.eval("wxaZones");
  const n0 = w.__zones.length;
  let z = await zones(26.25, -80.12);
  ok(z.length === 1 && z[0].id === "AMZ651" && w.__zones.length - n0 === 9, "on land: the place, then 8 points 4 miles out → AMZ651 (" + (w.__zones.length - n0) + " looks)");
  const n1 = w.__zones.length; z = await zones(26.25, -80.12);
  ok(z[0].id === "AMZ651" && w.__zones.length === n1, "…kept on the phone: a second look asks nothing");
  ok(/AMZ651/.test(w.localStorage.getItem("fm-wx-mzones")), "…saved in fm-wx-mzones");
  const n2 = w.__zones.length; z = await zones(26.25, -80.05);
  ok(z.length === 1 && w.__zones.length - n2 === 1, "in the water: one look");
  const n3 = w.__zones.length; z = await zones(26.25, -80.25);
  ok(z.length === 1 && w.__zones.length - n3 === 17, "9 miles inland: 4 miles finds nothing, 12 miles finds the zone (17 looks)");
  const n4 = w.__zones.length; z = await zones(26.47, -80.08, { lake: true });
  ok(z.length === 0 && w.__zones.length - n4 === 1, "a lake: only the place itself, never the ocean nearby");
  const n5 = w.__zones.length; z = await zones(51.5, -0.12);
  ok(z.length === 0 && w.__zones.length === n5, "outside the US: nothing asked");
  ok(w.eval("wxaInUs")(26.3, -79.9) && w.eval("wxaInUs")(21.3, -157.8) && !w.eval("wxaInUs")(51.5, -0.12), "US check covers coastal waters and Hawaii, not London");
  // verdict rules for marine names
  const V = (names) => w.eval("wxdVerdict")({ t: Date.now(), mph: 5, gust: 8, code: 1, rainPct: 0, waveFt: 1, wavePer: 9 }, { alerts: names });
  ok(V(["Gale Warning"]).boat.level === "stay" && V(["Gale Warning"]).shore.level === "good", "Gale Warning: Boat Stay home, Shore Good");
  ok(V(["Hazardous Seas Warning"]).boat.level === "stay" && V(["Hazardous Seas Watch"]).boat.level === "hard", "Hazardous Seas Warning = Stay home, Watch = Hard");
  ok(V(["Brisk Wind Advisory"]).boat.level === "hard" && V(["Small Craft Advisory"]).boat.why[0] === "Small Craft Advisory", "Brisk Wind / Small Craft Advisory = Boat Hard, reason named");
  ok(V(["Rip Current Statement"]).shore.level === "hard" && V(["Beach Hazards Statement"]).shore.level === "hard" && V(["Rip Current Statement"]).boat.level === "good", "rip current / beach hazards = Shore Hard (boat unchanged)");
  ok(V(["Marine Weather Statement"]).boat.level === "good", "Marine Weather Statement alone changes nothing");
  // merge: the same alert once
  const mg = w.eval("wxaMerge")([{ id: "a", event: "Gale Warning", urgent: true }], [{ id: "a", event: "Gale Warning", urgent: true }, { id: "b", event: "Small Craft Advisory" }]);
  ok(mg.length === 2 && mg[0].urgent, "the same alert from both lists shows once, urgent first");

  // Weather screen: alerts box + verdict for the place
  $("hn-wx-full").click(); await wait(1200);
  const box = $("wx-alerts");
  ok(box && /Small Craft Advisory/.test(box.textContent) && /Marine zone: Coastal waters from Jupiter Inlet to Deerfield Beach FL out 20 NM \(AMZ651\)/.test(box.textContent), "screen: alerts box with the advisory and its marine zone");
  ok(/until \d{1,2}:\d\d [AP]M/.test(box.textContent), "…with its end time");
  const ab = box.querySelector(".wx-alert"), more = ab.querySelector(".wx-alert-more");
  ok(more.hidden, "…details folded"); ab.click();
  ok(!more.hidden && /Seas 5 to 7 feet/.test(more.textContent) && ab.getAttribute("aria-expanded") === "true", "…tap to read the NWS text");
  ok(/Boat: Hard/.test(txt("wx-gobox")) && /Small Craft Advisory/.test(txt("wx-gobox")) && /Shore: Good/.test(txt("wx-gobox")), "Go or stay: Boat Hard because of the Small Craft Advisory");
  ok(txt("wxw-rip").includes("No alert"), "rip currents: No alert yet");
  // a rip current statement for the beach + a Gale Warning on the water
  w.__pointAlerts = [{ id: "p1", event: "Rip Current Statement" }];
  w.__marineAlerts = [{ id: "m2", event: "Gale Warning" }];
  $("wx-refresh").click(); await wait(1200);
  ok(/High risk/.test(txt("wxw-rip")) && $("wxw-rip").classList.contains("lvl-bad"), "Rip Current Statement → Rip currents tile: High risk");
  ok(/Shore: Hard/.test(txt("wx-gobox")) && /Rip Current Statement/.test(txt("wx-gobox")), "…and Shore: Hard");
  ok(/Boat: Stay home/.test(txt("wx-gobox")) && /Gale Warning/.test(txt("wx-gobox")), "Gale Warning → Boat: Stay home");
  ok($("wx-alerts").querySelector(".wx-alert.urgent") && /⛈️ Gale Warning/.test($("wx-alerts").querySelector(".wx-alert.urgent").textContent), "the gale shows first, in red");
  // a lake spot: no ocean alerts
  const sel = $("wx-spot-pick"); sel.value = "s2"; sel.dispatchEvent(new w.Event("change")); await wait(1200);
  ok(!/Gale/.test(txt("wx-alerts")) && /No marine zone nearby/.test(txt("wx-alerts")), "a lake spot: no ocean alerts, no marine zone");
  ok(!/Gale/.test(txt("wx-gobox")), "…the gale doesn't touch its verdict");
  // outside the US
  [...w.document.querySelectorAll(".wx-chip")].find(b => b.textContent === "Thames Steps").click(); await wait(1200);
  ok(/No official alerts or radar here/.test(txt("wx-alerts")) && !w.__pal.some(u => /point=51\./.test(u)) && !w.__zones.some(u => /point=51\./.test(u)), "London: 'No official alerts or radar here', nothing asked");
  ok(!$("wxw-rip"), "…no rip currents tile");

  // NWS down: says so, remembers nothing
  w = await open(false, false, true);
  w.document.getElementById("hn-wx-full").click(); await wait(1200);
  ok(/Couldn't check the alerts/.test(w.document.getElementById("wx-alerts").textContent), "NWS down: 'Couldn't check the alerts right now'");
  ok(!/AMZ651/.test(w.localStorage.getItem("fm-wx-mzones") || ""), "…no zone remembered");
  ok(/Shore:/.test(w.document.getElementById("wx-gobox").textContent), "…the verdicts still show");
  console.log(bad ? `${bad} FAILED` : "ALL OK"); process.exit(bad ? 1 : 0);
})();
