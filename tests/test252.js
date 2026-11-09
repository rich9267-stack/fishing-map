// test252: weather plan step 11 (v271) — rain radar (js/82): NOAA radar WMS loop (last hour) as a card on the Weather screen and a 🌧 Rain radar layer
// on the Map (Layers → On the water), plays the last hour, ⏸/▶, follows the map to Hawaii etc., hidden outside the US; scan list blocked → newest picture only.
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

async function open(wxDown, tideDown, nwsDown, capDown) {
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
    w.__cap = []; w.__wx = []; w.__more = []; w.__tide = []; w.__nws = []; w.__wt = [];
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
      if (/opengeo\.ncep\.noaa\.gov.*GetCapabilities/.test(url)) {
        w.__cap.push(url);
        if (capDown) throw new Error("blocked");
        const id = url.match(/geoserver\/(\w+)\//)[1], now = Math.floor(Date.now() / 120000) * 120000, ts = [];
        for (let k = 60; k >= 0; k--) ts.push(new Date(now - k * 120000).toISOString());   // a scan every 2 minutes for 2 hours
        return { ok: true, text: async () => `<WMS_Capabilities><Layer><Name>${id}_bref_qcd</Name><Dimension name="time" default="current" units="ISO8601">${ts.join(",")}</Dimension></Layer></WMS_Capabilities>` };
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
  // where the radar works
  const R = (a, b) => { const r = w.eval("wxrRegion")(a, b); return r ? r.id : null; };
  ok(R(26.23, -80.09) === "conus" && R(21.3, -157.8) === "hawaii" && R(18.45, -66.1) === "carib" && R(61.2, -149.9) === "alaska" && R(13.45, 144.75) === "guam", "regions: Pompano, Honolulu, San Juan, Anchorage, Guam");
  ok(R(51.5, -0.12) === null, "London: no radar");
  ok(w.__cap.length === 0, "nothing asked at app open");
  // scan times → frames
  const now = Date.parse("2026-11-09T20:00:00Z");
  const list = []; for (let k = 60; k >= 0; k--) list.push(new Date(now - k * 120000).toISOString());
  const t1 = w.eval("wxrParseTimes")(`<Name>conus_bref_qcd</Name><Dimension name="time" units="ISO8601">${list.join(",")}</Dimension>`, "conus_bref_qcd", now);
  ok(t1.length === 61 && t1[60].s === list[60], "comma list read (61 scan times, exact text kept)");
  const t2 = w.eval("wxrParseTimes")(`<Name>conus_bref_qcd</Name><Dimension name="time">2026-11-09T18:00:00.000Z/2026-11-09T20:00:00.000Z/PT2M</Dimension>`, "conus_bref_qcd", now);
  ok(t2.length === 61 && t2[60].t === now, "start/end/PT2M read the same way");
  const fr = w.eval("wxrPickFrames")(t1);
  ok(fr.length === 7 && fr[6].t === now && fr[0].t === now - 3600000 && fr[1].t - fr[0].t === 600000, "loop = 7 pictures, every 10 minutes, the last hour, newest last");
  ok(w.eval("wxrPickFrames")([]).length === 0 && w.eval("wxrParseTimes")("<x/>", "a", now).length === 0, "no list → no frames");

  // Map layer
  const row = w.document.querySelector('#layers-body .lyr[data-for="mx-radar"]');
  ok(row && !row.hidden && /Rain radar/.test(row.textContent), "Layers sheet has 🌧 Rain radar (On the water)");
  ok($("radar-bar").hidden, "radar bar hidden while off");
  w.eval("showView('map')"); $("map-layers-btn").click(); await wait(200);
  // jsdom draws nothing, so give the map a size (Leaflet works out the centre from it)
  ["clientWidth", "clientHeight"].forEach(k => Object.defineProperty($("map"), k, { get: () => 400, configurable: true }));
  w.eval("map").invalidateSize(); w.eval("map").setView([26.24, -80.1], 10);
  row.click(); await wait(600);
  ok($("mx-radar").getAttribute("aria-pressed") === "true" && row.getAttribute("aria-checked") === "true", "switch on");
  ok(!$("radar-bar").hidden && /🌧 \d{1,2}:\d\d [AP]M \(newest\)/.test(txt("radar-time")), "radar bar shows the newest picture's time: " + txt("radar-time"));
  ok(w.__cap.length === 1 && /geoserver\/conus\/conus_bref_qcd\/ows\?service=WMS/.test(w.__cap[0]), "asked NOAA's conus radar for its scan times");
  ok(w.eval("wxrMap.loop.frames.length") === 7 && !$("radar-play").hidden, "7 pictures in the loop, ⏸ shown");
  const l0 = txt("radar-time"); await wait(4500);
  ok(txt("radar-time") !== l0, "the loop moves: " + txt("radar-time"));
  $("radar-play").click();
  ok($("radar-play").textContent === "▶" && /\(newest\)/.test(txt("radar-time")), "⏸ stops on the newest picture");
  const l1 = txt("radar-time"); await wait(1500);
  ok(txt("radar-time") === l1, "…and stays there");
  w.eval("map").setView([51.5, -0.12], 8); await wait(400);
  ok(/US only/.test(txt("radar-time")) && $("radar-play").hidden && w.eval("wxrMap.loop") === null, "map moved over London: 'covers the US only'");
  w.eval("map").setView([21.3, -157.8], 8); await wait(600);
  ok(w.__cap.some(u => /geoserver\/hawaii\/hawaii_bref_qcd/.test(u)) && /\(newest\)/.test(txt("radar-time")), "over Hawaii: Hawaii's radar");
  row.click(); await wait(200);
  ok($("radar-bar").hidden && $("mx-radar").getAttribute("aria-pressed") === "false" && w.eval("wxrMap.loop") === null, "switch off: bar gone, layers removed");

  // Weather screen card
  w.eval("showView('list')"); await wait(200);
  $("hn-wx-full").click(); await wait(1500);
  const card = $("wxr-card");
  ok(card && card.previousElementSibling && card.previousElementSibling.id === "wx-gobox", "screen: radar card right below Go or stay home");
  ok(/RAIN RADAR/.test(card.textContent) && /NOAA \/ National Weather Service/.test(card.textContent), "…titled, with the NOAA credit");
  ok(/\d{1,2}:\d\d [AP]M/.test(txt("wxr-time")), "…shows a picture time: " + txt("wxr-time"));
  ok(!$("wxr-play").hidden, "…with ⏸ Pause");
  $("wxr-play").click();
  ok($("wxr-play").textContent === "▶ Play" && /\(newest\)/.test(txt("wxr-time")), "Pause → ▶ Play, on the newest picture");
  const nCap = w.__cap.length;
  $("wx-refresh").click(); await wait(1500);
  ok($("wxr-card") && w.__cap.length === nCap, "↻: new card, scan times kept 3 minutes (nothing asked again)");
  ok(/Weather data by Open-Meteo.*NOAA radar/.test(w.document.querySelector(".wx-credit").textContent), "credits line names NOAA radar");
  // London: no card
  [...w.document.querySelectorAll(".wx-chip")].find(b => b.textContent === "Thames Steps").click(); await wait(1200);
  ok(!$("wxr-card") && /No official alerts or radar here/.test(txt("wx-alerts")), "London spot: no radar card ('No official alerts or radar here')");
  // Open on the map
  [...w.document.querySelectorAll(".wx-chip")].find(b => b.textContent === "Pompano Pier").click(); await wait(1200);
  $("wxr-open").click(); await wait(600);
  ok(!$("view-map").hidden && w.eval("wxrMap.on") && !$("radar-bar").hidden, "🗺 Open on the map: Map opens with the radar on");
  const c = w.eval("map").getCenter();
  ok(Math.abs(c.lat - 26.232) < 0.01 && Math.abs(c.lng + 80.088) < 0.01 && w.eval("map").getZoom() === 8, "…centred on the spot");

  // scan list can't be read → newest picture only
  w = await open(false, false, false, true);
  w.document.getElementById("hn-wx-full").click(); await wait(1500);
  ok(w.document.getElementById("wxr-time").textContent === "Latest radar" && w.document.getElementById("wxr-play").hidden, "list blocked: 'Latest radar', no loop button");
  console.log(bad ? `${bad} FAILED` : "ALL OK"); process.exit(bad ? 1 : 0);
})();
