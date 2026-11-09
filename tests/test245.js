// test245: weather plan steps 3 + 4 (v264) — the Home weather card (js/74 wxdHomeStart) shows temp, sky, Shore/Boat chips and the
// next hours for the area now; Full weather opens the Weather screen (js/75, loaded only when opened) with Now, the Fishing right now
// score and Go or stay home; a spot can be picked (asked for that spot's place, remembered), "your area" goes back; ‹ Home returns;
// the weather failing says so plainly. The tide line and the alerts line on Home are still there.
process.env.TZ = "America/New_York";
const { JSDOM } = require("jsdom");
const fs = require("fs");
const sun = fs.readFileSync(require.resolve("suncalc"), "utf8");
const leaf = fs.readFileSync(require.resolve("leaflet/dist/leaflet.js"), "utf8");
const html = require("./load")();
const ME = "u-sam";
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPOTS = [{ id: "s1", name: "Pompano Pier", spot_type: "pier", water_type: "saltwater", lat: 26.232, lng: -80.088, created_by: ME, visibility: "private", is_exact: true },
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
    w.__wx = [];
    w.fetch = async url => {
      url = String(url);
      if (/open-meteo\.com\/v1\/(forecast|marine)/.test(url) && /forecast_days=10/.test(url)) {
        w.__wx.push(url);
        if (wxDown) throw new Error("offline");
        return { ok: true, json: async () => (/marine-api/.test(url) ? MAR() : FC()) };
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
  ok($("hn-wx") && $("hn-wx").parentNode.id === "hn-cond-sec", "Home: the weather card sits in the conditions card");
  ok(txt("hn-wx-temp") === "78°" && /Partly cloudy/.test(txt("hn-wx-sub")) && /feels 81°/.test(txt("hn-wx-sub")) && /rain 20%/.test(txt("hn-wx-sub")), "Home: 78°, partly cloudy, feels 81°, rain 20%");
  ok(/^Weather · /.test(txt("hn-wx-lab")), "Home: says whose area it is");
  const chips = [...$("hn-wx-go").querySelectorAll(".wx-go-chip")].map(c => c.className + "|" + c.textContent);
  ok(chips.length === 2 && /Shore/.test(chips[0]) && /lvl-hard/.test(chips[0]) && /Boat/.test(chips[1]) && /lvl-hard/.test(chips[1]), "Home: Shore Hard (16 mph) and Boat Hard (seas 4.6 ft) chips");
  ok($("hn-wx-hours").querySelectorAll(".wx-hr").length === 6 && /Now/.test($("hn-wx-hours").textContent), "Home: the next 6 hours, starting Now");
  ok($("hn-graph") && $("hn-line") && $("hn-alerts-sec"), "Home: the tide line, the one line and the alerts line are still there");
  const calls1 = w.__wx.length;
  ok(calls1 === 2 && /latitude=26\.240&longitude=-80\.100/.test(w.__wx[0]), "Home: one forecast + one marine call for the area now (Pompano)");
  ok(!w.document.querySelector('script[src*="75-weather-screen"]') && typeof w.renderWxScreen === "undefined", "the Weather screen's code is not loaded at start");

  // Full weather
  $("hn-wx-full").click(); await wait(400);
  ok(!$("view-wx").hidden && $("view-list").hidden, "Full weather opens the Weather screen");
  ok(txt("wx-temp") === "78°" && /High 82° · Low 72°/.test(txt("wx-now-card")) && /Wind E 16 mph, gusts 22/.test(txt("wx-now-card")), "screen: Now card (78°, high/low, wind E 16 gusts 22)");
  ok(/Fishing right now: (Great|Good|Fair|Slow)/.test(txt("wx-now-card")), "screen: the Fishing right now score");
  const go = txt("wx-gobox");
  ok(/Shore: Hard/.test(go) && /Boat: Hard/.test(go) && /Seas 4\.6 ft every 7 sec/.test(go) && /not a promise/.test(go), "screen: Go or stay home with reasons and the warning line");
  ok(w.__wx.length === calls1, "screen: same place within 30 minutes = no new calls");
  ok(/Open-Meteo\.com/.test(w.document.querySelector(".wx-credit").textContent), "screen: Open-Meteo is credited");
  const chipBtns = [...w.document.querySelectorAll(".wx-chip")];
  ok(chipBtns.length === 2 && chipBtns[0].classList.contains("on") && chipBtns[1].textContent === "Pompano Pier", "chips: your area (on) + your own spot; not other people's spots");
  ok($("wx-spot-pick") && $("wx-spot-pick").options.length === 3, "Other spot list has every spot you can see");

  // pick your spot
  chipBtns[1].click(); await wait(400);
  ok(w.__wx.length === calls1 + 2 && /latitude=26\.232&longitude=-80\.088/.test(w.__wx[calls1]), "picking Pompano Pier asks for that spot's weather");
  ok(JSON.parse(w.localStorage.getItem("fm-wx-place")).spot === "s1" && w.document.querySelector(".wx-chip.on").textContent === "Pompano Pier", "the pick is remembered and shown");
  // a lake from the list: the boat ignores seas
  const sel = $("wx-spot-pick"); sel.value = "s2"; sel.dispatchEvent(new w.Event("change")); await wait(400);
  ok(/Boat: Hard/.test(txt("wx-gobox")) && !/Seas/.test(txt("wx-gobox")), "a lake: Boat goes by wind only (no seas)");
  [...w.document.querySelectorAll(".wx-chip")][0].click(); await wait(300);
  ok(w.localStorage.getItem("fm-wx-place") === null && w.document.querySelector(".wx-chip.on") === w.document.querySelectorAll(".wx-chip")[0], "your area chip goes back to the area now");

  // back + the conditions card opens the screen too
  $("wx-back").click(); await wait(200);
  ok($("view-wx").hidden && !$("view-list").hidden, "‹ Home goes back");
  $("hn-cond").click(); await wait(300);
  ok(!$("view-wx").hidden, "tapping the tide part of the card opens the Weather screen too");
  $("wx-old").click(); await wait(200);
  ok(!$("view-list").hidden && $("cond-more").open, "the old long tide tables are still reachable from the screen");

  // weather down
  w = await open(true);
  ok(/Couldn't load the weather/.test(w.document.getElementById("hn-wx-sub").textContent) && /Tide|tide/.test(w.document.getElementById("hn-wx-sub").textContent), "weather down: Home says so plainly (tides still work)");
  w.document.getElementById("hn-wx-full").click(); await wait(500);
  ok(/Couldn't load the weather|No signal/.test(w.document.getElementById("wx-body").textContent), "weather down: the screen says so and offers Try again");

  console.log(bad ? `${bad} FAILED` : "ALL OK"); process.exit(bad ? 1 : 0);
})();
