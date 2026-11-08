// test243: weather plan step 1 (js/74-weather.js) — one forecast for a place from Open-Meteo forecast + marine:
// right units (°F, mph, feet, inHg, miles), the place's time zone, pressure trend, "now" taken from the current hour,
// kept 30 minutes (no second call), asked again after that, an offline phone gets the kept one marked stale,
// marine failing or blank (a lake) still gives the weather, two asks at once share one call, only the last few places kept.
const fs = require("fs"), path = require("path"), vm = require("vm");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };

const H = 3600000, T0 = Date.UTC(2026, 10, 8, 17, 0);   // Nov 8 2026, noon in Florida
const hoursT = []; for (let i = -12; i < 48; i++) hoursT.push((T0 + i * H) / 1000);
const arr = f => hoursT.map((t, i) => f(i, t));
function fc() {
  return {
    timezone: "America/New_York",
    current: { time: T0 / 1000 + 600, temperature_2m: 78.4, apparent_temperature: 81.2, weather_code: 2, cloud_cover: 40, wind_speed_10m: 16.2, wind_gusts_10m: 22.4, wind_direction_10m: 92, pressure_msl: 1016.5, is_day: 1 },
    hourly_units: { visibility: "m" },
    hourly: { time: hoursT, temperature_2m: arr(i => 70 + i / 10), apparent_temperature: arr(i => 72 + i / 10), weather_code: arr(i => i === 20 ? 95 : 2),
      precipitation_probability: arr(i => i === 12 ? 20 : 10), wind_speed_10m: arr(() => 15), wind_gusts_10m: arr(() => 21), wind_direction_10m: arr(() => 90),
      pressure_msl: arr(i => 1020 - i * 0.5), uv_index: arr(() => 6.04), visibility: arr(() => 16093.4), is_day: arr(() => 1) },
    daily: { time: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (T0 - 12 * H + d * 24 * H) / 1000), weather_code: Array(10).fill(3), temperature_2m_max: Array(10).fill(82.4),
      temperature_2m_min: Array(10).fill(71.6), precipitation_probability_max: Array(10).fill(30), wind_speed_10m_max: Array(10).fill(18), wind_gusts_10m_max: Array(10).fill(25),
      wind_direction_10m_dominant: Array(10).fill(80), uv_index_max: Array(10).fill(7), sunrise: Array(10).fill(T0 / 1000 - 5 * 3600), sunset: Array(10).fill(T0 / 1000 + 5 * 3600) }
  };
}
function mar(blank) {
  const mt = hoursT.slice(12);
  const m = f => mt.map((t, i) => blank ? null : f(i));
  return { hourly_units: { wave_height: "m", swell_wave_height: "m" }, daily_units: { wave_height_max: "m" },
    hourly: { time: mt, wave_height: m(() => 1.4), wave_period: m(() => 7), wave_direction: m(() => 95), swell_wave_height: m(() => 0.6), swell_wave_period: m(() => 11),
      swell_wave_direction: m(() => 45), sea_surface_temperature: m(() => 77.04) },
    daily: { time: [], wave_height_max: Array(10).fill(blank ? null : 1.8) } };
}

function makeCtx() {
  const store = {};
  const c = { calls: [], net: true, marMode: "ok", console, Promise, Math, JSON, Object, Array, Number, String, isFinite, Error, encodeURIComponent, setTimeout,
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } }, __store: store,
    tzFor: () => "America/New_York" };
  c.fetch = async url => {
    c.calls.push(url);
    await new Promise(r => setTimeout(r, 20));
    if (!c.net) throw new Error("offline");
    if (/marine-api/.test(url)) {
      if (c.marMode === "fail") return { ok: false, status: 500, json: async () => ({}) };
      return { ok: true, json: async () => mar(c.marMode === "blank") };
    }
    return { ok: true, json: async () => fc() };
  };
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/74-weather.js"), "utf8") + "\nthis.get = wxdGet; this.setClock = f => { wxdClock = f; }; this.dir = wxdDir; this.sky = wxdSky;", c);
  return c;
}

(async () => {
  let c = makeCtx(); let now = T0 + 600000; c.setClock(() => now);
  const wx = await c.get(26.257, -80.081);
  ok(c.calls.length === 2 && /api\.open-meteo\.com\/v1\/forecast/.test(c.calls[0]) && /marine-api\.open-meteo\.com/.test(c.calls[1]), "first look: one forecast call + one marine call");
  ok(/wind_speed_unit=mph/.test(c.calls[0]) && /temperature_unit=fahrenheit/.test(c.calls[0]) && /timezone=America%2FNew_York/.test(c.calls[0]) && /forecast_days=10/.test(c.calls[0]) && /past_hours=12/.test(c.calls[0]), "asks in mph / °F, the place's own time zone, 10 days, last 12 hours");
  ok(!/apikey|key=/i.test(c.calls.join(" ")) && !/rich|email/i.test(c.calls.join(" ")), "no key and nothing about the person in the request");
  ok(wx.now.tempF === 78 && wx.now.feelsF === 81 && wx.now.sky === "Partly cloudy" && wx.now.mph === 16 && wx.now.gust === 22 && wx.now.dir === "E", "now: 78°, feels 81°, partly cloudy, E 16 gust 22");
  ok(wx.now.inHg === 30.02, "pressure turned into inHg (1016.5 hPa = 30.02)");
  ok(wx.now.rainPct === 20 && wx.now.uv === 6 && wx.now.visMi === 10, "rain chance, UV and visibility (miles) come from the current hour");
  ok(wx.now.trend === "falling", "pressure going down 1.5 hPa in 3 hours = falling");
  ok(wx.marine && wx.now.waveFt === 4.6 && wx.now.wavePer === 7 && wx.now.swellFt === 2 && wx.now.swellPer === 11 && wx.now.waterF === 77, "waves 4.6 ft every 7 s, swell 2 ft every 11 s, water 77° (metres turned into feet)");
  ok(wx.hours.length === 60 && wx.hours.some(h => h.code === 95), "60 hours kept (12 back + 48 ahead), thunder hour still there");
  ok(wx.days.length === 10 && wx.days[0].hiF === 82 && wx.days[0].loF === 72 && wx.days[0].waveMaxFt === 5.9 && wx.days[0].sunrise, "10 days with highs/lows, wind, highest waves, sunrise/sunset");
  ok(c.dir(0) === "N" && c.dir(359) === "N" && c.dir(225) === "SW" && c.sky(95) === "Thunderstorms" && c.sky(1234) === "—", "compass words and sky words");

  now += 20 * 60000;
  await c.get(26.2571, -80.0809);
  ok(c.calls.length === 2, "20 minutes later, same place: nothing asked again");
  now += 15 * 60000;
  await c.get(26.257, -80.081);
  ok(c.calls.length === 4, "after 30 minutes: asked again");

  const n0 = c.calls.length;
  const both = await Promise.all([c.get(27.7, -82.6), c.get(27.7, -82.6)]);
  ok(c.calls.length === n0 + 2 && both[0] === both[1], "two asks at once for a new place share one forecast");

  // offline: a fresh app open on the same phone gets the kept forecast, marked stale
  const saved = c.__store["fm-wxd"];
  let c2 = makeCtx(); c2.localStorage.setItem("fm-wxd", saved); c2.net = false; let now2 = now + 2 * H; c2.setClock(() => now2);
  const old = await c2.get(26.257, -80.081);
  ok(old.stale === true && old.now.tempF === 78, "offline: the last forecast kept on the phone, marked stale");
  let failed = false; try { await c2.get(40.7, -74.0); } catch (e) { failed = true; }
  ok(failed, "offline with nothing kept for that place: says it failed (the screen will show 'Couldn't load')");
  c2.net = true; const fresh = await c2.get(26.257, -80.081);
  ok(!fresh.stale, "back online: a fresh forecast");

  // marine broken or blank (a lake): the weather still works, no waves
  let c3 = makeCtx(); c3.setClock(() => T0); c3.marMode = "fail";
  const w3 = await c3.get(26.3, -80.2);
  ok(w3.now.tempF === 78 && !w3.marine && w3.now.waveFt == null, "marine service down: weather still shown, no waves");
  c3.marMode = "blank";
  const w4 = await c3.get(28.5, -81.4);
  ok(!w4.marine && w4.days[0].waveMaxFt == null, "inland lake (marine blank): no waves");

  // only the last 6 places are kept on the phone
  for (let i = 0; i < 8; i++) await c3.get(30 + i, -85);
  ok(Object.keys(JSON.parse(c3.__store["fm-wxd"])).length === 6, "only the last 6 places are kept on the phone");

  console.log(bad ? `${bad} FAILED` : "ALL OK"); process.exit(bad ? 1 : 0);
})();
