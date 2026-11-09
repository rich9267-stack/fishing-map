// test246: weather plan step 5 (v265) — Hour by hour on the Weather screen (js/76, loaded only when opened): 48 swipeable columns
// (time, sky, temp, rain %, wind arrow + mph, gusts), Wind / Temp / Rain / Waves tabs with a chart lined up with the columns,
// marks for high/low tide (window.homeTides for the area; the spot's own station + tide timing otherwise; none at lakes),
// sunrise/sunset and major/minor feeding times.
process.env.TZ = "America/New_York";
const { JSDOM } = require("jsdom");
const fs = require("fs");
const sun = fs.readFileSync(require.resolve("suncalc"), "utf8");
const leaf = fs.readFileSync(require.resolve("leaflet/dist/leaflet.js"), "utf8");
const html = require("./load")();
const ME = "u-sam";
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPOTS = [{ id: "s1", name: "Pompano Pier", spot_type: "pier", water_type: "saltwater", lat: 26.232, lng: -80.088, created_by: ME, visibility: "private", is_exact: true, tide_offset_min: 60 },
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
    w.__wx = []; w.__tide = [];
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
  ok(typeof w.wxhSection === "undefined", "the hour-by-hour code is not loaded at start");
  ok(Array.isArray(w.homeTides) && w.homeTides.length > 4, "Home tides are loaded (window.homeTides)");
  $("hn-wx-full").click(); await wait(500);
  const sec = $("wx-hours");
  ok(sec && /Hour by hour/.test(sec.textContent) && /next 48 hours/.test(sec.textContent), "screen: Hour by hour, next 48 hours");
  ok(sec.compareDocumentPosition($("wx-gobox")) & w.Node.DOCUMENT_POSITION_PRECEDING, "…it sits below Go or stay home");
  const cols = () => [...sec.querySelectorAll(".wxh-col")];
  ok(cols().length === 48, "48 hour columns");
  const c0 = cols()[0];
  ok(/Now/.test(c0.querySelector(".wxh-time").textContent) && c0.classList.contains("now"), "first column = Now");
  ok(c0.querySelector("svg") && /°$/.test(c0.querySelector(".wxh-temp").textContent) && c0.querySelector(".wxh-rain").textContent === "20%", "a column has the sky picture, temp and rain %");
  ok(c0.querySelector(".wxh-mph").textContent === "16" && c0.querySelector(".wxh-gust").textContent === "g22", "…wind 16 and gusts g22");
  const rot = c0.querySelector(".wxh-arrow path").getAttribute("transform");
  ok(/rotate\(270 /.test(rot) && /from E/.test(c0.querySelector(".wxh-arrow").getAttribute("aria-label")), "the arrow points the way an east wind blows (west)");
  ok(/2[0-9]?[ ]?(AM|PM)|\d+ (AM|PM)/.test(cols()[1].querySelector(".wxh-time").textContent) && !/:00/.test(cols()[1].querySelector(".wxh-time").textContent), "later columns show the hour (e.g. 2 PM)");
  ok(cols().some(c => c.classList.contains("newday") && /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/.test(c.querySelector(".wxh-time").textContent)), "midnight columns show the day name");
  // tabs
  const tabs = () => [...sec.querySelectorAll(".wxh-tab")];
  ok(tabs().map(b => b.textContent).join(",") === "Wind,Temp,Rain,Waves" && tabs()[0].classList.contains("on"), "tabs Wind / Temp / Rain / Waves, Wind first");
  ok(sec.querySelectorAll(".wxh-chart path.wxh-line").length === 2 && /gusts/.test(sec.querySelector(".wxh-legend").textContent), "Wind chart: wind + gusts lines");
  ok(+sec.querySelector(".wxh-chart").getAttribute("width") === 48 * 58 && +sec.querySelector(".wxh-inner").style.width.replace("px", "") === 48 * 58, "the chart lines up with the columns (swipes with them)");
  tabs()[2].click();
  ok(sec.querySelectorAll(".wxh-chart rect.wxh-bar").length === 48 && /rain/.test(sec.querySelector(".wxh-legend").textContent) && w.localStorage.getItem("fm-wx-tab") === "rain", "Rain tab: bars, remembered");
  tabs()[1].click();
  ok(sec.querySelectorAll(".wxh-chart path.wxh-line").length === 2 && /feels like/.test(sec.querySelector(".wxh-legend").textContent), "Temp tab: temp + feels-like");
  tabs()[3].click();
  ok(/waves/.test(sec.querySelector(".wxh-legend").textContent) && cols()[0].querySelector(".wxh-wave").textContent === "4.6 ft", "Waves tab: wave line + wave height in each column");
  // marks
  const all = () => cols().map(c => c.querySelector(".wxh-marks").textContent).join("|");
  const highCol = cols().findIndex(c => c.querySelector(".mk-high"));
  ok(highCol === 3 && cols()[9].querySelector(".mk-low"), "area: high tide 3 h from now, low 9 h (window.homeTides)");
  ok(/▲ tide/.test(c0.textContent) || /▲ tide/.test(cols()[0].textContent), "Now column: tide coming in");
  ok(sec.querySelectorAll(".mk-sunrise").length >= 1 && sec.querySelectorAll(".mk-sunset").length >= 1, "sunrise and sunset are marked");
  ok(sec.querySelectorAll(".mk-major").length >= 2 && sec.querySelectorAll(".mk-minor").length >= 1, "major and minor feeding times are marked");
  ok(cols().some(c => c.classList.contains("feed-major")) && cols().some(c => c.classList.contains("feed-minor")), "hours inside a feeding time are underlined");
  ok(/major feed/.test(txt("wx-hours")) && /sunrise \/ sunset/.test(txt("wx-hours")), "a small key explains the colours");
  // a spot: its own station, shifted by its tide timing (+60 min)
  const tide0 = w.__tide.length;
  [...w.document.querySelectorAll(".wx-chip")].find(b => b.textContent === "Pompano Pier").click(); await wait(600);
  const sec2 = $("wx-hours"), cols2 = [...sec2.querySelectorAll(".wxh-col")];
  ok(w.__tide.length >= tide0, "the spot asks its own tide station (or shares the one already asked)");
  ok(cols2.findIndex(c => c.querySelector(".mk-high")) === 4 && /Tides from/.test(sec2.textContent), "spot: high tide moved by its +60 min tide timing, station named");
  ok(sec2.querySelector(".wxh-tab.on").textContent === "Waves", "the tab choice is kept");
  // a lake: no waves tab, no tides
  const sel = $("wx-spot-pick"); sel.value = "s2"; sel.dispatchEvent(new w.Event("change")); await wait(500);
  const sec3 = $("wx-hours");
  ok(![...sec3.querySelectorAll(".wxh-tab")].some(b => b.textContent === "Waves") && sec3.querySelector(".wxh-tab.on").textContent === "Wind", "lake: no Waves tab (falls back to Wind)");
  ok(!sec3.querySelector(".mk-high") && !sec3.querySelector(".mk-low") && /No tides at a lake/.test(sec3.textContent), "lake: no tide marks, says why");
  ok(sec3.querySelector(".mk-major"), "lake: feeding times still shown");
  console.log(bad ? `${bad} FAILED` : "ALL OK"); process.exit(bad ? 1 : 0);
})();
