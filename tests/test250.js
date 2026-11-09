// test250: weather plan step 9 (v269) — Next 10 days card on the Weather screen (js/80, loaded only when opened), below Sun, moon & feeding
// times: a row per day (name, sky, rain %, low–high bar, wind, day score = js/69 fcDayScore + that day's wind), tap a day for its hours and
// tides, days 8–10 greyed; lakes / far spots have no tides; the old "Tide tables for the next days" button is gone.
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
  current: { time: T0 / 1000, temperature_2m: 78.4, apparent_temperature: 81.2, weather_code: 2, cloud_cover: 40, wind_speed_10m: 16, wind_gusts_10m: 22, wind_direction_10m: 92, pressure_msl: 1016.5, is_day: 1 },
  hourly_units: { visibility: "m" },
  hourly: { time: hoursT, temperature_2m: arr(i => 70 + i / 5), apparent_temperature: arr(i => 72 + i / 5), weather_code: arr(() => 2), precipitation_probability: arr(() => 20),
    wind_speed_10m: arr(() => 16), wind_gusts_10m: arr(() => 22), wind_direction_10m: arr(() => 90), pressure_msl: arr(i => 1020 - i * 0.5), uv_index: arr(i => { const hr = new Date(hoursT[i] * 1000).getHours(); return hr >= 10 && hr < 16 ? 6.2 : 0.5; }), visibility: arr(() => 16093), is_day: arr(() => 1) },
  daily: { time: DAYS.map(t => t / 1000), weather_code: [2, 61, 0, 0, 3, 3, 2, 0, 0, 95], temperature_2m_max: [82, 80, 79, 78, 81, 83, 84, 80, 77, 76], temperature_2m_min: [72, 70, 66, 65, 68, 70, 71, 69, 64, 63],
    precipitation_probability_max: [20, 70, 10, 0, 5, 5, 15, 0, 0, 60], wind_speed_10m_max: [16, 30, 8, 6, 12, 12, 14, 9, 9, 20], wind_gusts_10m_max: [22, 40, 12, 10, 18, 18, 20, 14, 14, 30], wind_direction_10m_dominant: [90, 45, 0, 315, 90, 90, 100, 0, 0, 200],
    uv_index_max: Array(10).fill(7), sunrise: Array(10).fill(null), sunset: Array(10).fill(null) } });
const MAR = () => { const mt = hoursT.slice(12), m = v => mt.map(() => v);
  return { hourly_units: { wave_height: "m", swell_wave_height: "m" }, hourly: { time: mt, wave_height: m(1.4), wave_period: m(7), wave_direction: m(95), swell_wave_height: m(0.6), swell_wave_period: m(11), swell_wave_direction: m(45), sea_surface_temperature: m(77) },
    daily: { time: [], wave_height_max: [] } }; };

async function open(wxDown, tideDown) {
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
  ok(typeof w.wxdySection === "undefined", "the 10-day code is not loaded at start");
  $("hn-wx-full").click(); await wait(900);
  const card = $("wx-days");
  ok(card && /Next 10 days/.test(card.textContent) && /moon \+ tide \+ wind/.test(card.textContent), "screen: a Next 10 days card (score from moon + tide + wind)");
  ok($("wx-sunmoon").compareDocumentPosition(card) & w.Node.DOCUMENT_POSITION_FOLLOWING, "…below Sun, moon & feeding times");
  ok(!$("wx-old"), "the old 'Tide tables for the next days' button is gone");
  ok(card.compareDocumentPosition(w.document.querySelector(".wx-credit")) & w.Node.DOCUMENT_POSITION_FOLLOWING, "credit line stays at the bottom");
  const rows = () => [...card.querySelectorAll(".wxdy-row")];
  ok(rows().length === 10, "10 rows, one per day (" + rows().length + ")");
  const r0 = rows()[0], r1 = rows()[1];
  ok(r0.querySelector(".wxdy-name").textContent === "Today" && /^[A-Z][a-z]{2}$/.test(r1.querySelector(".wxdy-name").textContent), "Today, then short day names: " + r1.querySelector(".wxdy-name").textContent);
  ok(r1.querySelector(".wxdy-name").textContent === new Date(DAYS[1] + 12 * H).toLocaleDateString([], { weekday: "short", timeZone: "America/New_York" }), "…tomorrow's name is right");
  ok(r0.querySelector(".wxdy-ic svg") && r0.querySelector(".wxdy-rain").textContent === "20%" && r1.querySelector(".wxdy-rain").textContent === "70%" && r1.querySelector(".wxdy-rain").classList.contains("wet"), "sky picture + rain % per day (rainy days in blue)");
  ok(r0.querySelector(".wxdy-lo").textContent === "72°" && r0.querySelector(".wxdy-hi").textContent === "82°" && /72 to 82 degrees/.test(r0.querySelector(".wxdy-bar svg").getAttribute("aria-label")), "low–high temperature bar");
  const fx = rows().map(r => parseFloat(r.querySelector(".wxdy-fill").getAttribute("x")));
  ok(fx[9] === 0 && fx[0] > fx[3], "bars share one scale across the 10 days (coldest low starts at the left)");
  ok(r0.querySelector(".wxdy-wind").textContent === "E 16" && r1.querySelector(".wxdy-wind").textContent === "NE 30", "wind direction + mph: " + r1.querySelector(".wxdy-wind").textContent);
  // day score = fcDayScore + wind
  const sc = w.eval("wxdyScore"), place = { lat: w.eval("LAT"), lng: w.eval("LNG"), tz: "America/New_York" };
  const fcd = w.eval("fcDayScore");
  const wday = k => ({ t: DAYS[k], mph: [16, 30, 8][k], gust: [22, 40, 12][k] });
  const tp = k => { const d = new Date(DAYS[k] + 12 * H); return [d.getFullYear(), d.getMonth(), d.getDate()]; };
  const base1 = fcd(...tp(1), null, place).score, s1 = sc(wday(1), place, null);
  ok(s1.score === Math.max(0, Math.min(10, Math.round(base1 - 3))) && s1.why.some(x => /Very windy \(30 mph, gusts 40\)/.test(x)), `very windy day: moon/tide score ${base1} − 3 = ${s1.score}`);
  const base2 = fcd(...tp(2), null, place).score, s2 = sc(wday(2), place, null);
  ok(s2.score === Math.min(10, Math.round(base2 + 0.5)) && s2.why.some(x => /Light wind/.test(x)), `light wind day: ${base2} + ½ = ${s2.score}`);
  const s0 = sc(wday(0), place, null);
  ok(s0.why.some(x => /^Windy \(16 mph/.test(x)), "16 mph = Windy (−1½)");
  ok(rows().every(r => /^\d{1,2}$/.test(r.querySelector(".wxdy-score").textContent) && /great|good|fair|slow/.test(r.dataset.lvl)), "every row has a 0–10 score with its colour level");
  // tides feed the score: the bigger swing later in the 10 days counts
  ok(w.__tide.some(u => /range=264/.test(u) && /station=/.test(u)), "one NOAA call for 11 days of tides");
  const tl = w.eval("wxdyTideList");
  ok(Math.abs(tl(w.eval("[]"), 0, "America/New_York").swingMax) === 0, "tide list helper: empty = no swing");
  ok(+rows()[1].querySelector(".wxdy-score").textContent < +rows()[2].querySelector(".wxdy-score").textContent, "on screen the very windy day scores below the calm day after it");
  // days 8–10 greyed
  ok(rows().slice(7).every(r => r.classList.contains("rough")) && rows().slice(0, 7).every(r => !r.classList.contains("rough")), "days 8–10 are greyed, 1–7 are not");
  ok(/Days 8–10 are rougher guesses/.test(card.textContent), "says days 8–10 are rougher guesses");
  // tap today: its hours from the screen's forecast (no extra call) + its tides
  r0.click(); await wait(100);
  ok(rows()[0].classList.contains("open") && rows()[0].getAttribute("aria-expanded") === "true" && $("wxdy-panel"), "tapping a day opens it");
  ok(rows()[0].nextElementSibling === $("wxdy-panel"), "…right under that row");
  const hrs = [...$("wxdy-hours").querySelectorAll(".wxdy-hr")];
  ok(hrs.length >= 5 && hrs.every(h => /\d{1,2}[ap]/.test(h.querySelector(".wxdy-hr-t").textContent)), `today's hours, every 3 hours (${hrs.length}): ` + hrs.map(h => h.querySelector(".wxdy-hr-t").textContent).join(" "));
  ok(w.__more.length === 0, "today's hours come from the forecast the screen already has");
  ok($("wxdy-graph") && $("wxdy-graph").querySelector("path") && [...$("wxdy-tides").querySelectorAll(".wxw-tide")].length === 4, "today's tide line + its 4 highs/lows");
  ok(/High \d{1,2}:\d\d [AP]M · \d\.\d ft/.test(txt("wxdy-tides")), "tide rows: High 3:30 AM · 1.7 ft");
  ok(/sunrise \d{1,2}:\d\d [AP]M/.test(txt("wxdy-sum")) && /wind from E up to 16 mph, gusts 22/.test(txt("wxdy-sum")), "day line: sky, high/low, rain, wind, sunrise/sunset");
  ok(/DAY SCORE \d+/.test(txt("wxdy-panel")) && $("wxdy-why").children.length >= 2, "why the score");
  // tap a far day: hours asked once, tides for that day
  rows()[5].click(); await wait(400);
  ok(!rows()[0].classList.contains("open") && rows()[5].classList.contains("open"), "one day open at a time");
  ok(w.__more.length === 1 && /forecast_days=10/.test(w.__more[0]) && /hourly=/.test(w.__more[0]), "a far day: one call for the 10 days of hours");
  const h5 = [...$("wxdy-hours").querySelectorAll(".wxdy-hr")];
  ok(h5.length === 8 && h5[0].querySelector("b").textContent === "60°" && h5[2].querySelector("b").textContent === "66°", "day 6: 8 hours (12a … 9p) with temps");
  const day5 = [...$("wxdy-tides").querySelectorAll(".wxw-tide")];
  ok(day5.length === 4 && /2\.\d ft/.test(day5.map(x => x.textContent).join()), "day 6: that day's tides (" + day5.map(x => x.textContent).join(" | ") + ")");
  rows()[8].click(); await wait(200);
  ok(w.__more.length === 1, "…kept: another far day asks nothing new");
  ok(/rougher guess/.test(txt("wxdy-panel")), "day 9 panel says it's a rougher guess");
  rows()[8].click(); await wait(50);
  ok(!$("wxdy-panel") && rows().every(r => !r.classList.contains("open")), "tapping again closes it");
  // a lake: no tides
  const sel = $("wx-spot-pick"); sel.value = "s2"; sel.dispatchEvent(new w.Event("change")); await wait(800);
  ok(/Lake or canal: no tides/.test(txt("wx-days")), "a lake: no tides, score from moon + wind");
  $("wxdy-row0").click(); await wait(100);
  ok(!/TIDES/.test(txt("wxdy-panel")), "…and its days show no tides");
  // a spot far from any station (London): no tides, its own time zone
  [...w.document.querySelectorAll(".wx-chip")].find(b => b.textContent === "Thames Steps").click(); await wait(900);
  ok(/No tide station nearby/.test(txt("wx-days")) && rows().length === 10, "far away spot: 10 days, no tide station");
  // Pompano Pier: its own station moved by its tide timing
  [...w.document.querySelectorAll(".wx-chip")].find(b => b.textContent === "Pompano Pier").click(); await wait(900);
  $("wxdy-row1").click(); await wait(100);
  ok(/Moved 60 min later/.test(txt("wxdy-panel")), "a spot: its tide timing is used");

  // tides down: scores still show
  w = await open(false, true);
  w.document.getElementById("hn-wx-full").click(); await wait(900);
  ok(w.document.querySelectorAll("#wx-days .wxdy-row").length === 10 && /couldn't load/.test(w.document.getElementById("wxdy-note").textContent), "tides down: 10 days still shown, says the score uses moon + wind");
  console.log(bad ? `${bad} FAILED` : "ALL OK"); process.exit(bad ? 1 : 0);
})();
