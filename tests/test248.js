// test248: weather plan step 7 (v267) — Tides + Water & waves on the Weather screen (js/78, loaded only when opened), below the wind /
// pressure cards: the same tide line as Home (js/63 tideCurveSvg, shared), next 4 highs/lows with feet, station name; tiles for water temp,
// waves, swell, UV (+ sunscreen hours), rip currents (NWS alert), visibility (fog); lakes: no Tides card, no waves / swell / rip currents.
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
const hoursT = []; for (let i = -12; i < 48; i++) hoursT.push((T0 + i * H) / 1000);
const arr = f => hoursT.map((t, i) => f(i));
const FC = () => ({ timezone: "America/New_York",
  current: { time: T0 / 1000, temperature_2m: 78.4, apparent_temperature: 81.2, weather_code: 2, cloud_cover: 40, wind_speed_10m: 16, wind_gusts_10m: 22, wind_direction_10m: 92, pressure_msl: 1016.5, is_day: 1 },
  hourly_units: { visibility: "m" },
  hourly: { time: hoursT, temperature_2m: arr(i => 70 + i / 5), apparent_temperature: arr(i => 72 + i / 5), weather_code: arr(() => 2), precipitation_probability: arr(() => 20),
    wind_speed_10m: arr(() => 16), wind_gusts_10m: arr(() => 22), wind_direction_10m: arr(() => 90), pressure_msl: arr(i => 1020 - i * 0.5), uv_index: arr(i => { const hr = new Date(hoursT[i] * 1000).getHours(); return hr >= 10 && hr < 16 ? 6.2 : 0.5; }), visibility: arr(() => 16093), is_day: arr(() => 1) },
  daily: { time: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (T0 - 12 * H + d * 86400000) / 1000), weather_code: Array(10).fill(3), temperature_2m_max: Array(10).fill(82), temperature_2m_min: Array(10).fill(72),
    precipitation_probability_max: Array(10).fill(30), wind_speed_10m_max: Array(10).fill(18), wind_gusts_10m_max: Array(10).fill(25), wind_direction_10m_dominant: Array(10).fill(80),
    uv_index_max: Array(10).fill(7), sunrise: Array(10).fill(null), sunset: Array(10).fill(null) } });
const MAR = () => { const mt = hoursT.slice(12), m = v => mt.map(() => v);
  return { hourly_units: { wave_height: "m", swell_wave_height: "m" }, hourly: { time: mt, wave_height: m(1.4), wave_period: m(7), wave_direction: m(95), swell_wave_height: m(0.6), swell_wave_period: m(11), swell_wave_direction: m(45), sea_surface_temperature: m(77) },
    daily: { time: [], wave_height_max: [] } }; };

async function open(wxDown) {
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
    w.__wx = []; w.__tide = []; w.__nws = []; w.__wt = [];
    w.fetch = async url => {
      url = String(url);
      if (/open-meteo\.com\/v1\/(forecast|marine)/.test(url) && /forecast_days=10/.test(url)) {
        w.__wx.push(url);
        if (wxDown) throw new Error("offline");
        return { ok: true, json: async () => (/marine-api/.test(url) ? MAR() : FC()) };
      }
      if (/tidesandcurrents.*product=predictions/.test(url) && /interval=hilo/.test(url)) {
        w.__tide.push(url);
        const g = t => new Date(t).toISOString().slice(0, 16).replace("T", " ");
        return { ok: true, json: async () => ({ predictions: [-9, -3, 3, 9, 15, 21, 27, 33, 39, 45].map((k, i) => ({ t: g(T0 + k * H + 30 * 60000), v: i % 2 ? "0.3" : "2.6", type: i % 2 ? "L" : "H" })) }) };
      }
      if (/marine-api.*current=sea_surface_temperature/.test(url)) { w.__wt.push(url); return { ok: true, json: async () => ({ current: { sea_surface_temperature: 78.1 } }) }; }
      if (/api\.weather\.gov\/(points|stations)/.test(url)) w.__nws.push(url);
      if (/api\.weather\.gov\/stations\/KPMP\/observations/.test(url)) {
        // hourly readings for the last 12 h, falling from 30.20 to 30.02 inHg (in pascals, like the NWS)
        const f = []; for (let k = 12; k >= 0; k--) f.push({ properties: { timestamp: new Date(Date.now() - k * H - 5 * 60000).toISOString(), barometricPressure: { value: (30.02 + k * 0.015) * 3386.39 } } });
        return { ok: true, json: async () => ({ features: f }) };
      }
      return { ok: true, json: async () => ({ properties: {}, features: [], elements: [], results: [], items: [] }) };
    };
  }});
  const w = dom.window; w.scrollTo = () => {}; w.requestAnimationFrame = f => setTimeout(f, 16); w.SVGSVGElement.prototype.createSVGRect = () => ({}); w.eval(leaf);
  await wait(4500);
  return w;
}

(async () => {
  const w = await open();
  const $ = id => w.document.getElementById(id), txt = id => ($(id) ? $(id).textContent : "");
  ok(typeof w.wxwSections === "undefined", "the tides / water code is not loaded at start");
  ok(typeof w.tideCurveSvg === "function" && $("hn-graph").querySelector(".tide-curve"), "Home still draws its tide line (now with the shared tideCurveSvg)");
  $("hn-wx-full").click(); await wait(800);
  const tides = $("wx-tides"), water = $("wx-water");
  ok(tides && water, "screen: a Tides card and a Water & waves card");
  ok($("wx-windp").compareDocumentPosition(tides) & w.Node.DOCUMENT_POSITION_FOLLOWING, "…below the wind / pressure cards");
  ok(tides.compareDocumentPosition(water) & w.Node.DOCUMENT_POSITION_FOLLOWING, "…Tides first, then Water & waves");
  // tides
  const g = $("wxw-graph");
  ok(g.querySelector(".tide-curve") && g.querySelector(".tide-now"), "tide line + dashed now line (the same drawing as Home)");
  ok(["6a", "12p", "6p", "12a"].every(l => [...g.querySelectorAll("text")].some(t => t.textContent === l)), "labels 6a · 12p · 6p · 12a · 6a (today and the night)");
  const rows = [...$("wxw-list").querySelectorAll(".wxw-tide")];
  ok(rows.length === 4 && rows.every(r => /(High|Low) \d{1,2}:\d\d [AP]M · \d\.\d ft/.test(r.textContent)), "the next 4 highs and lows with time and feet");
  ok(rows.some(r => r.classList.contains("hi") && /2\.6 ft/.test(r.textContent)) && rows.some(r => r.classList.contains("lo") && /0\.3 ft/.test(r.textContent)), "…High 2.6 ft, Low 0.3 ft");
  ok(/station/.test(txt("wxw-tide-src")), "station name shown: " + txt("wxw-tide-src"));
  // water & waves
  await wait(300);
  const big = id => $(id) ? $(id).querySelector(".wxw-big").textContent : null, sub = id => $(id) ? $(id).querySelector(".wxw-sub").textContent : null;
  ok(big("wxw-wt") === "78°" && sub("wxw-wt") === "ocean estimate" && w.__wt.length, "water temp 78° from the same source as the rest of the app (no station within 20 mi here → ocean estimate)");
  ok(big("wxw-waves") === "5 ft" && sub("wxw-waves") === "every 7 sec · from E", "waves 5 ft · every 7 sec · from E");
  ok(big("wxw-swell") === "2 ft" && sub("wxw-swell") === "every 11 sec · from NE", "swell 2 ft · every 11 sec · from NE");
  ok(/^\d+ · /.test(big("wxw-uv")) && /sunscreen|low all day/.test(sub("wxw-uv")), "UV with its word + sunscreen hours: " + big("wxw-uv") + " / " + sub("wxw-uv"));
  ok(w.eval("wxwUvWord")(2) === "Low" && w.eval("wxwUvWord")(5) === "Moderate" && w.eval("wxwUvWord")(7) === "High" && w.eval("wxwUvWord")(9) === "Very high" && w.eval("wxwUvWord")(11) === "Extreme", "UV words: Low / Moderate / High / Very high / Extreme");
  const uv = w.eval("wxwUv")(await w.wxdGet(w.eval("LAT"), w.eval("LNG")), Date.now(), "America/New_York");
  ok(uv.from == null || (new Date(uv.from).getHours() === 10 && new Date(uv.to).getHours() === 16), "sunscreen hours = the hours with UV 3 or more (10 AM–4 PM)");
  ok(big("wxw-rip") === "No alert", "rip currents: No alert when the NWS has none");
  ok(big("wxw-vis") === "10+ mi" && sub("wxw-vis") === "no fog expected", "visibility 10+ mi · no fog expected");
  ok(w.eval("wxwRange")([1.2, 1.4, 1.6]) === "1–2 ft" && w.eval("wxwRange")([0.2, 0.4]) === "Under 1 ft" && w.eval("wxwRange")([4.2, 4.9]) === "4–5 ft" && w.eval("wxwRange")([null]) === null, "wave range wording: 1–2 ft, Under 1 ft, 4–5 ft");
  ok(w.eval("wxwFog")({ hours: [{ t: Date.now() + 2 * H, code: 45 }] }, Date.now()) && !w.eval("wxwFog")({ hours: [{ t: Date.now() + 2 * H, code: 2, visMi: 9 }] }, Date.now()), "fog = fog code or under 1 mile in the next 12 h");
  // a rip current alert
  // v270: the screen asks the NWS for its own place (land zone + marine zone), so the alert comes from the (fake) NWS
  const f0 = w.fetch;
  w.fetch = async u => /alerts\/active\?point/.test(String(u)) ? { ok: true, json: async () => ({ features: [{ properties: { id: "r1", event: "Rip Current Statement", areaDesc: "Coastal Broward" } }] }) } : f0(u);
  $("wx-refresh").click(); await wait(800);
  ok(big("wxw-rip") === "High risk" && $("wxw-rip").classList.contains("lvl-bad"), "Rip Current Statement → High risk (orange)");
  w.fetch = f0;
  // a spot: its own station, moved by its tide timing
  [...w.document.querySelectorAll(".wx-chip")].find(b => b.textContent === "Pompano Pier").click(); await wait(800);
  ok($("wxw-graph").querySelector(".tide-curve") && /station/.test(txt("wxw-tide-src")), "spot: tide line from its own station");
  ok(/Moved 60 min later/.test(txt("wxw-tide-note")), "…moved 60 min later (its tide timing)");
  ok($("wxw-list").querySelectorAll(".wxw-tide").length === 4 && /ft/.test(txt("wxw-list")), "…4 highs/lows with feet (spot tides now carry heights)");
  // a lake: no tides, no waves / swell / rip currents
  const sel = $("wx-spot-pick"); sel.value = "s2"; sel.dispatchEvent(new w.Event("change")); await wait(800);
  ok(!$("wx-tides") && $("wx-water"), "lake: no Tides card, Water & waves still there");
  ok(!$("wxw-waves") && !$("wxw-swell") && !$("wxw-rip") && $("wxw-uv") && $("wxw-vis"), "…no waves / swell / rip currents; UV and visibility stay");
  ok(/Lakes and canals/.test(txt("wx-water")), "…says why");
  ok(/NOAA Tides & Currents/.test(w.document.querySelector(".wx-credit").textContent), "credit line names NOAA Tides & Currents");
  console.log(bad ? `${bad} FAILED` : "ALL OK"); process.exit(bad ? 1 : 0);
})();
