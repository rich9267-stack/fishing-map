// test249: weather plan step 8 (v268) — Sun, moon & feeding times card on the Weather screen (js/79, loaded only when opened), below
// Water & waves: first light / sunrise / sunset / last light, a drawn moon + phase + % lit + next new / full moon, major / minor feeding
// times with why (js/06 solunarPeriods for the place's own day), Today / Tomorrow, works for a spot far away (its own time zone).
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
const FC = url => ({ timezone: /latitude=51\./.test(url || "") ? "Europe/London" : "America/New_York",
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
        return { ok: true, json: async () => (/marine-api/.test(url) ? MAR() : FC(url)) };
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
  ok(typeof w.wxmSection === "undefined", "the sun & moon code is not loaded at start");
  $("hn-wx-full").click(); await wait(800);
  const card = $("wx-sunmoon");
  ok(card && /Sun, moon & feeding times/.test(card.textContent), "screen: a Sun, moon & feeding times card");
  ok($("wx-water").compareDocumentPosition(card) & w.Node.DOCUMENT_POSITION_FOLLOWING, "…below Water & waves");
  // sun
  const tm = /\d{1,2}:\d\d [AP]M/;
  ok(["wxm-first", "wxm-rise", "wxm-set", "wxm-last"].every(id => tm.test(txt(id))), "first light, sunrise, sunset, last light all show a time: " + txt("wxm-sun"));
  const S = w.eval("wxmSun")(new Date(), { lat: w.eval("LAT"), lng: w.eval("LNG"), tz: "America/New_York" });
  ok(S.first < S.rise && S.rise < S.set && S.set < S.last && S.rise - S.first < 40 * 60000 && S.rise - S.first > 15 * 60000, "first light 15–40 min before sunrise, last light after sunset");
  ok(txt("wxm-rise").includes(w.eval("clock")(S.rise, "America/New_York")), "sunrise matches SunCalc for the area");
  // moon
  const svg = $("wxm-moonrow").querySelector("svg.wxm-moon");
  ok(svg && svg.querySelector(".wxm-dark"), "a drawn moon picture");
  const m = w.eval("moonAt")(new Date());
  ok(txt("wxm-phase") === `${m.phase.charAt(0).toUpperCase() + m.phase.slice(1)} · ${m.illum}% lit`, "phase + % lit (same as the rest of the app): " + txt("wxm-phase"));
  ok(/New moon (today|tomorrow|in \d+ days)/.test(txt("wxm-next")) && /Full moon (today|tomorrow|in \d+ days)/.test(txt("wxm-next")), "next new and full moon: " + txt("wxm-next"));
  // a known date: full moon 2026-11-24 , new moon 2026-12-09
  const nx = w.eval("wxmNextPhases")(Date.UTC(2026, 10, 10));
  ok(new Date(nx.fullAt).toISOString().slice(0, 10) === "2026-11-24", "next full moon after Nov 10 2026 = Nov 24");
  ok(Math.abs(nx.newAt - Date.UTC(2026, 11, 9, 0, 52)) < 6 * 3600000, "next new moon after Nov 10 2026 = Dec 9 (within 6 h)");
  // moon pictures: new = dark only, full = whole lit circle, half = a path
  const pic = (ph, f) => { const d = w.document.createElement("div"); d.innerHTML = w.eval("wxmMoonSvg")(ph, f, 40); return d; };
  ok(!pic(0, 0).querySelector(".wxm-lit") && pic(0.5, 1).querySelector("circle.wxm-lit") && pic(0.25, 0.5).querySelector("path.wxm-lit"), "moon pictures: new = dark, full = lit circle, quarter = half lit");
  ok(/A20\.00|A0\.00/.test(pic(0.25, 0.5).querySelector("path").getAttribute("d")), "…quarter moon's shadow line is straight");
  // feeding times
  const rows = [...$("wxm-feed").querySelectorAll(".wxm-row")];
  const per = w.eval("solunarPeriods")(new Date(), w.eval("LAT"), w.eval("LNG"), "America/New_York");
  ok(rows.length === per.length && rows.length >= 2, `one row per feeding time (${rows.length})`);
  ok(rows.every(r => /^(Major|Minor)$/.test(r.querySelector(".wxm-kind").textContent) && /\d:\d\d [AP]M – \d{1,2}:\d\d [AP]M/.test(r.querySelector(".wxm-time").textContent)), "each row: Major/Minor + start – end");
  ok(rows.every(r => /moon overhead|moon underfoot|moonrise|moonset/.test(r.querySelector(".wxm-why").textContent)), "each row says why (moon overhead / underfoot / moonrise / moonset)");
  ok(rows.filter(r => r.classList.contains("major")).every(r => /overhead|underfoot/.test(r.textContent)), "major = moon overhead or underfoot");
  const now = Date.now();
  ok(rows.every((r, i) => r.classList.contains("past") === (+per[i].end < now)), "past feeding times are greyed");
  ok(w.eval("wxmNearSun")({ start: +S.rise - 30 * 60000, end: +S.rise + 90 * 60000 }, S) === "near sunrise" && w.eval("wxmNearSun")({ start: +S.rise + 4 * 3600000, end: +S.rise + 5 * 3600000 }, S) === "", "a feeding time at sunrise is marked 'near sunrise'");
  ok(/A help, not a promise/.test(card.textContent), "says what major / minor mean + 'A help, not a promise'");
  // tomorrow
  const before = txt("wxm-rise");
  $("wxm-tomorrow").click(); await wait(50);
  ok($("wxm-tomorrow").classList.contains("on") && $("wxm-tomorrow").getAttribute("aria-pressed") === "true", "Tomorrow chip on");
  const S2 = w.eval("wxmSun")(new Date(Date.now() + 86400000), { lat: w.eval("LAT"), lng: w.eval("LNG"), tz: "America/New_York" });
  ok(txt("wxm-rise").includes(w.eval("clock")(S2.rise, "America/New_York")) && S2.rise - S.rise > 20 * 3600000, "tomorrow: tomorrow's sunrise (" + before + " → " + txt("wxm-rise") + ")");
  ok($("wxm-feed").querySelectorAll(".wxm-row.past").length === 0, "…tomorrow's feeding times are not greyed");
  $("wxm-today").click(); await wait(50);
  ok($("wxm-today").classList.contains("on"), "Today chip goes back");
  // a spot far away uses its own place + time zone
  [...w.document.querySelectorAll(".wx-chip")].find(b => b.textContent === "Thames Steps").click(); await wait(800);
  const L = w.eval("wxmSun")(new Date(), { lat: 51.5, lng: -0.12, tz: "Europe/London" });
  ok(txt("wxm-rise").includes(w.eval("clock")(L.rise, "Europe/London")), "London spot: sunrise in London time (" + txt("wxm-rise") + ")");
  // the old button now only offers the long tide tables (its moon part is this card)
  [...w.document.querySelectorAll(".wx-chip")][0].click(); await wait(800);
  ok($("wx-old") && $("wx-old").textContent === "Tide tables for the next days", "old button now says 'Tide tables for the next days'");
  ok(w.document.querySelector(".wx-credit") && card.compareDocumentPosition(w.document.querySelector(".wx-credit")) & w.Node.DOCUMENT_POSITION_FOLLOWING, "credit line stays at the bottom");
  console.log(bad ? `${bad} FAILED` : "ALL OK"); process.exit(bad ? 1 : 0);
})();
