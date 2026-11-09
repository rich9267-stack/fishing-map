// test247: weather plan step 6 (v266) — Wind dial + pressure card on the Weather screen (js/77, loaded only when opened), side by side
// below Hour by hour: dial (N/E/S/W, arrow from the wind's side, mph, "From E · gusts 22", onshore/offshore at a spot that faces the water),
// pressure now in inHg + Rising/Falling/Steady, last 12 h from NWS station readings in the US (forecast elsewhere), next 12 h dashed, one hint.
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
    wind_speed_10m: arr(() => 16), wind_gusts_10m: arr(() => 22), wind_direction_10m: arr(() => 90), pressure_msl: arr(i => 1020 - i * 0.5), uv_index: arr(() => 6), visibility: arr(() => 16093), is_day: arr(() => 1) },
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
    w.__wx = []; w.__tide = []; w.__nws = [];
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
  ok(typeof w.wxpSection === "undefined", "the wind & pressure code is not loaded at start");
  $("hn-wx-full").click(); await wait(700);
  const sec = $("wx-windp");
  ok(sec && sec.querySelector("#wxp-wind") && sec.querySelector("#wxp-press"), "screen: a Wind card and a Pressure card");
  ok($("wx-hours") && ($("wx-hours").compareDocumentPosition(sec) & w.Node.DOCUMENT_POSITION_FOLLOWING), "…below Hour by hour");
  ok(sec.classList.contains("wxp") && sec.children.length === 2, "…side by side (one two-column row)");
  // wind dial
  const dial = sec.querySelector(".wxp-dial");
  ok(["N", "E", "S", "W"].every(k => [...dial.querySelectorAll(".wxp-cmp")].some(t => t.textContent === k)), "dial shows N / E / S / W");
  ok(dial.querySelector(".wxp-mph").textContent === "16" && /mph/.test(dial.textContent), "16 mph in the middle");
  ok(dial.getAttribute("aria-label") === "Wind from the east, 16 mph, gusts 22", "screen readers hear: Wind from the east, 16 mph, gusts 22");
  const tip = dial.querySelector(".wxp-arrow").getAttribute("d").match(/^M([\d.]+) ([\d.]+)/);
  ok(tip && +tip[1] > 70 && Math.abs(+tip[2] - 55) < 2, "the arrow sits on the east side of the ring (points in, the way the wind blows)");
  ok(txt("wxp-from") === "From E · gusts 22", "line under the dial: From E · gusts 22");
  ok(!$("wxp-kind"), "area: no onshore/offshore line");
  // pressure from the station
  await wait(300);
  const pr = $("wxp-press");
  ok(pr.dataset.src === "station" && /KPMP/.test(pr.textContent), "US: last 12 h from the NWS station (KPMP)");
  ok(w.__nws.some(u => /stations\/KPMP\/observations\?start=/.test(u)), "…asked for 12 hours of readings");
  ok(/^30\.02 inHg$/.test(txt("wxp-now")), "pressure now 30.02 inHg");
  ok(txt("wxp-trend") === "↘ Falling" && $("wxp-trend").classList.contains("tr-falling"), "↘ Falling");
  ok(/feed before a front/.test(txt("wxp-hint")), "hint: Fish often feed before a front.");
  ok(pr.querySelector(".wxp-past") && pr.querySelector(".wxp-next") && /−12 h/.test(pr.textContent) && /\+12 h/.test(pr.textContent), "line: solid last 12 h, dashed next 12 h, −12 h … now … +12 h");
  const d = w.wxpData(await w.wxdGet(w.eval("LAT"), w.eval("LNG")), await w.wxpStationPast(w.eval("LAT"), w.eval("LNG")));
  ok(d.next.length === 12 && Math.abs(d.next[0].inHg - (30.02 + (1013.5 - 1014) / 33.8639)) < 0.012, "forecast line moved to join the station's now reading");
  // rules
  ok(w.wxpTrend([{ t: 0, inHg: 30 }, { t: 3 * H, inHg: 30.05 }]).trend === "rising" && w.wxpTrend([{ t: 0, inHg: 30 }, { t: 3 * H, inHg: 30.01 }]).trend === "steady", "trend rule: ±0.03 inHg in 3 h");
  ok(w.wxpTrend([{ t: 0, inHg: 30 }, { t: 1 * H, inHg: 29.9 }]).trend === null, "…needs at least 1.5 h between readings");
  ok(/front may be coming/.test(w.wxpHint("falling", -0.08, 29.9)) && /slow/.test(w.wxpHint("rising", 0.07, 30)) && /deeper/.test(w.wxpHint("steady", 0, 30.25)), "hints for falling fast, rising fast, high and steady");
  ok(w.wxpDial(0, 90, 2).includes('aria-label="Calm"'), "calm wind says Calm");
  // a spot that faces the water to the east: onshore
  [...w.document.querySelectorAll(".wx-chip")].find(b => b.textContent === "Pompano Pier").click(); await wait(700);
  ok(/Onshore here/.test(txt("wxp-kind")), "spot facing east + east wind: Onshore here");
  // outside the US: no NWS, the forecast's own last 12 h
  const n0 = w.__nws.length;
  [...w.document.querySelectorAll(".wx-chip")].find(b => b.textContent === "Thames Steps").click(); await wait(700);
  const pr3 = $("wxp-press");
  ok(w.__nws.slice(n0).every(u => !/51\.5/.test(u)) && pr3.dataset.src === "forecast" && /From the forecast/.test(pr3.textContent), "outside the US: no station asked, line from the forecast");
  ok(txt("wxp-trend") === "↘ Falling" && pr3.querySelector(".wxp-past") && pr3.querySelector(".wxp-next"), "…still shows Falling and both halves of the line");
  console.log(bad ? `${bad} FAILED` : "ALL OK"); process.exit(bad ? 1 : 0);
})();
