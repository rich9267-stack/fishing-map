// ---- 🌦 Weather data (weather plan step 1, Project doc claude/weather-plan.md): one forecast for a place ----
// Open-Meteo forecast (whole world) + Open-Meteo marine (waves, swell, water temp; blank inland). °F, mph, feet, inHg.
// 48 hours (plus the last 12 for the pressure trend) and 10 days, in the place's own time zone (tzFor, js/53).
// Kept 30 minutes per place (about ½ mile) in memory and on the phone, so a second look costs no calls and an offline phone
// still shows the last forecast (marked stale). Nothing on screen yet: the Weather screen (step 3) and Home card (step 4) read it.
// Open-Meteo's free tier is for non-commercial use only and must be credited (see the lawyer packet, line 40).
const WXD_TTL = 30 * 60000, WXD_KEEP = 6, WXD_SAVE = "fm-wxd";
let wxdClock = () => Date.now();          // tests change this
const wxdMem = {};
const wxdKey = (lat, lng) => lat.toFixed(2) + "," + lng.toFixed(2);
const WXD_SKY = { 0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Cloudy", 45: "Fog", 48: "Fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  56: "Freezing drizzle", 57: "Freezing drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains", 80: "Showers", 81: "Showers", 82: "Heavy showers", 85: "Snow showers", 86: "Snow showers",
  95: "Thunderstorms", 96: "Thunderstorms with hail", 99: "Thunderstorms with hail" };
const wxdSky = code => WXD_SKY[code] || "—";
const wxdThunder = code => code >= 95;
function wxdDir(deg) {
  if (deg == null || !isFinite(deg)) return "";
  return ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"][Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}
const wxdR = (v, d) => v == null || !isFinite(v) ? null : (d ? Math.round(v * 10 ** d) / 10 ** d : Math.round(v));
const wxdFt = (v, unit) => v == null ? null : /ft|feet/i.test(unit || "") ? v : v * 3.28084;
const wxdMi = (v, unit) => v == null ? null : /ft|feet/i.test(unit || "") ? v / 5280 : v / 1609.34;

function wxdSaved() { try { return JSON.parse(localStorage.getItem(WXD_SAVE) || "{}") || {}; } catch (e) { return {}; } }
function wxdStore(key, wx) {
  try {
    const all = wxdSaved(); all[key] = wx;
    const keys = Object.keys(all).sort((a, b) => all[b].at - all[a].at);
    keys.slice(WXD_KEEP).forEach(k => delete all[k]);   // keep only the last few places
    localStorage.setItem(WXD_SAVE, JSON.stringify(all));
  } catch (e) { /* phone storage full: memory only */ }
}

function wxdUrls(lat, lng, tz) {
  const at = `latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}&timeformat=unixtime&timezone=${encodeURIComponent(tz || "auto")}`;
  const f = "https://api.open-meteo.com/v1/forecast?" + at +
    "&current=temperature_2m,apparent_temperature,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m,wind_direction_10m,pressure_msl,is_day" +
    "&hourly=temperature_2m,apparent_temperature,weather_code,precipitation_probability,wind_speed_10m,wind_gusts_10m,wind_direction_10m,pressure_msl,uv_index,visibility,is_day" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,uv_index_max,sunrise,sunset" +
    "&past_hours=12&forecast_hours=48&forecast_days=10&wind_speed_unit=mph&temperature_unit=fahrenheit&precipitation_unit=inch";
  const m = "https://marine-api.open-meteo.com/v1/marine?" + at +
    "&hourly=wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction,sea_surface_temperature" +
    "&daily=wave_height_max&past_hours=0&forecast_hours=48&forecast_days=10&length_unit=imperial&temperature_unit=fahrenheit";
  return { f, m };
}

// Turn the two answers into one tidy forecast (also used by the tests)
function wxdParse(fc, mar, lat, lng, tz, at) {
  const h = fc.hourly || {}, hu = fc.hourly_units || {}, now = at;
  const hours = (h.time || []).map((t, i) => ({
    t: t * 1000, tempF: wxdR(h.temperature_2m[i]), feelsF: wxdR(h.apparent_temperature[i]), code: h.weather_code[i],
    rainPct: wxdR(h.precipitation_probability ? h.precipitation_probability[i] : null), mph: wxdR(h.wind_speed_10m[i]), gust: wxdR(h.wind_gusts_10m[i]),
    deg: wxdR(h.wind_direction_10m[i]), inHg: h.pressure_msl[i] == null ? null : wxdR(h.pressure_msl[i] / 33.8639, 2),
    uv: wxdR(h.uv_index ? h.uv_index[i] : null, 1), visMi: wxdR(wxdMi(h.visibility ? h.visibility[i] : null, hu.visibility), 1), isDay: h.is_day ? !!h.is_day[i] : null,
    waveFt: null, wavePer: null, waveDeg: null, swellFt: null, swellPer: null, swellDeg: null, waterF: null
  }));
  // pressure trend: the change over 3 hours (same ±0.03 inHg rule as the rest of the app)
  hours.forEach((x, i) => {
    const b = hours.find(y => y.t === x.t - 3 * 3600000);
    x.trend = b && b.inHg != null && x.inHg != null ? (x.inHg - b.inHg >= 0.03 ? "rising" : x.inHg - b.inHg <= -0.03 ? "falling" : "steady") : null;
  });
  let marine = false;
  if (mar && mar.hourly && mar.hourly.time) {
    const mh = mar.hourly, mu = mar.hourly_units || {};
    mh.time.forEach((t, i) => {
      const x = hours.find(y => y.t === t * 1000); if (!x) return;
      x.waveFt = wxdR(wxdFt(mh.wave_height[i], mu.wave_height), 1); x.wavePer = wxdR(mh.wave_period[i]); x.waveDeg = wxdR(mh.wave_direction[i]);
      x.swellFt = wxdR(wxdFt(mh.swell_wave_height ? mh.swell_wave_height[i] : null, mu.swell_wave_height), 1);
      x.swellPer = wxdR(mh.swell_wave_period ? mh.swell_wave_period[i] : null); x.swellDeg = wxdR(mh.swell_wave_direction ? mh.swell_wave_direction[i] : null);
      x.waterF = wxdR(mh.sea_surface_temperature ? mh.sea_surface_temperature[i] : null, 1);
      if (x.waveFt != null) marine = true;
    });
  }
  const d = fc.daily || {}, mdMax = mar && mar.daily && mar.daily.wave_height_max, mdu = mar && mar.daily_units || {};
  const days = (d.time || []).map((t, i) => ({
    t: t * 1000, code: d.weather_code[i], hiF: wxdR(d.temperature_2m_max[i]), loF: wxdR(d.temperature_2m_min[i]),
    rainPct: wxdR(d.precipitation_probability_max ? d.precipitation_probability_max[i] : null), mph: wxdR(d.wind_speed_10m_max[i]), gust: wxdR(d.wind_gusts_10m_max[i]),
    deg: wxdR(d.wind_direction_10m_dominant[i]), uv: wxdR(d.uv_index_max ? d.uv_index_max[i] : null, 1),
    sunrise: d.sunrise && d.sunrise[i] ? d.sunrise[i] * 1000 : null, sunset: d.sunset && d.sunset[i] ? d.sunset[i] * 1000 : null,
    waveMaxFt: marine && mdMax ? wxdR(wxdFt(mdMax[i], mdu.wave_height_max), 1) : null
  }));
  const c = fc.current || {}, hr = hours.filter(x => x.t <= now).pop() || hours[0] || {};
  const nowW = {
    t: c.time ? c.time * 1000 : hr.t, tempF: wxdR(c.temperature_2m), feelsF: wxdR(c.apparent_temperature), code: c.weather_code,
    sky: wxdSky(c.weather_code), cloud: wxdR(c.cloud_cover), mph: wxdR(c.wind_speed_10m), gust: wxdR(c.wind_gusts_10m), deg: wxdR(c.wind_direction_10m),
    dir: wxdDir(c.wind_direction_10m), inHg: c.pressure_msl == null ? null : wxdR(c.pressure_msl / 33.8639, 2), isDay: c.is_day == null ? null : !!c.is_day,
    rainPct: hr.rainPct, uv: hr.uv, visMi: hr.visMi, trend: hr.trend,
    waveFt: hr.waveFt, wavePer: hr.wavePer, waveDeg: hr.waveDeg, swellFt: hr.swellFt, swellPer: hr.swellPer, swellDeg: hr.swellDeg, waterF: hr.waterF
  };
  return { at, lat, lng, tz: tz || fc.timezone || null, marine, now: nowW, hours, days };
}

// The forecast for a place. opts.force = ask again even if the kept one is fresh.
// Resolves to the forecast (stale: true when it is an old one kept on the phone because the internet failed); rejects only when there is none at all.
function wxdGet(lat, lng, opts) {
  opts = opts || {};
  const key = wxdKey(lat, lng), now = wxdClock();
  const m = wxdMem[key];
  if (m && !opts.force && (m.busy || now - m.at < WXD_TTL)) return m.p;
  const kept = wxdSaved()[key];
  if (kept && !opts.force && now - kept.at < WXD_TTL) { wxdMem[key] = { at: kept.at, p: Promise.resolve(kept) }; return wxdMem[key].p; }
  const tz = typeof tzFor === "function" ? tzFor(lat, lng) : null, u = wxdUrls(lat, lng, tz);
  const getJ = url => fetch(url).then(r => { if (!r.ok) throw new Error("weather " + r.status); return r.json(); });
  const slot = wxdMem[key] = { at: now, busy: true };
  slot.p = Promise.all([getJ(u.f), getJ(u.m).catch(() => null)]).then(([fc, mar]) => {
    if (!fc || !fc.hourly) throw new Error("no forecast");
    const wx = wxdParse(fc, mar, lat, lng, tz, now);
    wxdStore(key, wx); slot.busy = false; slot.at = now;
    return wx;
  }).catch(err => {
    slot.busy = false; delete wxdMem[key];   // try again next time
    if (kept) return Object.assign({}, kept, { stale: true });
    throw err;
  });
  return slot.p;
}

// ---- Go or stay home? (weather plan step 2): Shore and Boat, each Good / Hard / Stay home, with the reasons ----
// All the numbers are here so they are easy to change. A help, not a promise: the screen always says to check the official forecast.
const WXD_LIMITS = {
  shore: { stayMph: 25, stayGust: 35, hardMph: 16, hardGust: 26, hardRain: 60 },
  boat: { stayMph: 25, stayGust: 30, hardMph: 15, staySeas: 6, hardSeas: 3, chopSeas: 2, chopPeriod: 6 },
  thunderHours: 2          // thunder expected within this many hours = stay home (shore and boat)
};
const WXD_ALERT_STAY = /tornado|hurricane|tropical storm|severe thunderstorm|extreme wind|tsunami/i;
const WXD_ALERT_BOAT_STAY = /gale|storm warning|storm watch|special marine warning|hurricane force|hazardous seas/i;
const WXD_ALERT_BOAT_HARD = /small craft|brisk wind/i;
const WXD_ALERT_SHORE_HARD = /high surf|coastal flood|rip current|beach hazard/i;   // v270: rip currents / beach hazards make the shore Hard (surf, wading, jetties)
const WXD_WORD = { good: "Good", hard: "Hard", stay: "Stay home" };

// h = one hour from wxdGet (mph, gust, code, rainPct, waveFt, wavePer); o.ahead = the next hours; o.alerts = NWS alert names; o.lake = no waves here
function wxdVerdict(h, o) {
  o = o || {};
  const L = WXD_LIMITS, alerts = (o.alerts || []).map(a => String(a || "")), lake = !!o.lake || h.waveFt == null;
  const mk = () => ({ level: "good", why: [] });
  const shore = mk(), boat = mk();
  const rank = { good: 0, hard: 1, stay: 2 };
  const put = (v, level, why) => {   // a worse level replaces the reasons; the same level adds one
    if (rank[level] > rank[v.level]) { v.level = level; v.why = [why]; } else if (rank[level] === rank[v.level] && !v.why.includes(why)) v.why.push(why);
  };
  // alerts first
  alerts.forEach(a => {
    const lvl = /watch/i.test(a) ? "hard" : "stay";   // a Watch = it may happen (Hard); a Warning = it is happening (Stay home)
    if (WXD_ALERT_STAY.test(a)) { put(shore, lvl, a); put(boat, lvl, a); }
    else if (WXD_ALERT_BOAT_STAY.test(a)) put(boat, lvl, a);
    else if (WXD_ALERT_BOAT_HARD.test(a)) put(boat, "hard", a);
    if (WXD_ALERT_SHORE_HARD.test(a)) put(shore, "hard", a);
  });
  // thunder now or soon
  const soon = [h].concat((o.ahead || []).filter(x => x.t > h.t && x.t <= h.t + L.thunderHours * 3600000));
  const boom = soon.find(x => wxdThunder(x.code));
  if (boom) { const w = boom === h ? "Thunderstorms now" : `Thunderstorms expected within ${L.thunderHours} hours`; put(shore, "stay", w); put(boat, "stay", w); }
  // wind
  const mph = h.mph, gust = h.gust;
  if (mph != null || gust != null) {
    const wtxt = `Wind ${mph == null ? "?" : mph} mph${gust != null ? `, gusts ${gust}` : ""}`;
    if (mph > L.shore.stayMph || gust > L.shore.stayGust) put(shore, "stay", wtxt);
    else if (mph >= L.shore.hardMph || gust >= L.shore.hardGust) put(shore, "hard", wtxt);
    if (mph > L.boat.stayMph || gust > L.boat.stayGust) put(boat, "stay", wtxt);
    else if (mph >= L.boat.hardMph) put(boat, "hard", wtxt);
  }
  // seas (boat only, not on lakes)
  if (!lake) {
    const ft = h.waveFt, per = h.wavePer, stxt = `Seas ${ft} ft${per ? ` every ${per} sec` : ""}`;
    if (ft > L.boat.staySeas) put(boat, "stay", stxt);
    else if (ft >= L.boat.hardSeas) put(boat, "hard", stxt);
    else if (ft >= L.boat.chopSeas && per && per < L.boat.chopPeriod) put(boat, "hard", stxt + " (short, choppy)");
  }
  if (h.rainPct != null && h.rainPct >= L.shore.hardRain) { put(shore, "hard", `${h.rainPct}% chance of rain`); put(boat, "hard", `${h.rainPct}% chance of rain`); }
  [shore, boat].forEach(v => { v.word = WXD_WORD[v.level]; if (!v.why.length) v.why.push("No problems in the forecast"); });
  return { shore, boat, lake };
}

// ---- Small weather pictures (sun, moon, cloud, rain, thunder, fog, snow) as SVG text ----
function wxdIcon(code, isDay, size) {
  const s = size || 28, sun = '<circle cx="18" cy="18" r="8" fill="#e8a317"/>', moon = '<path d="M24 8a11 11 0 1 0 9 17 9 9 0 0 1-9-17z" fill="#8a8fe0"/>';
  const cloud = (x = 0) => `<path d="M${14 + x} 38h20a7 7 0 0 0 0-14 10 10 0 0 0-19 3 6 6 0 0 0-1 11z" fill="#dfe7ea" stroke="#9db2ba" stroke-width="1.5"/>`;
  let d;
  if (code >= 95) d = cloud() + '<path d="M26 39l-4 7h5l-3 6" fill="none" stroke="#e3a812" stroke-width="2.5" stroke-linejoin="round"/>';
  else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) d = cloud() + '<path d="M20 41l-2 5M27 41l-2 5M34 41l-2 5" stroke="#3b7dd8" stroke-width="2.2" stroke-linecap="round"/>';
  else if ((code >= 71 && code <= 77) || code === 85 || code === 86) d = cloud() + '<circle cx="20" cy="44" r="1.8" fill="#7fa7c9"/><circle cx="28" cy="46" r="1.8" fill="#7fa7c9"/><circle cx="35" cy="44" r="1.8" fill="#7fa7c9"/>';
  else if (code === 45 || code === 48) d = '<path d="M8 18h32M6 25h36M10 32h28M8 39h32" stroke="#9db2ba" stroke-width="3" stroke-linecap="round"/>';
  else if (code === 3) d = cloud(-4);
  else if (code === 1 || code === 2) d = (isDay === false ? moon : sun) + cloud();
  else d = isDay === false ? moon.replace("M24 8", "M26 10") : '<circle cx="24" cy="24" r="9" fill="#e8a317"/><path d="M24 7v4M24 37v4M7 24h4M37 24h4M12 12l3 3M33 33l3 3M12 36l3-3M33 15l3-3" stroke="#e8a317" stroke-width="2.5" stroke-linecap="round"/>';
  return `<svg width="${s}" height="${s}" viewBox="0 0 48 48" aria-hidden="true">${d}</svg>`;
}
const wxdEsc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const wxdNowHour = (wx, t) => (wx.hours.filter(h => h.t <= (t || Date.now())).pop()) || wx.hours[0];
const wxdAlertNames = () => (typeof wx !== "undefined" && wx && Array.isArray(wx.list) ? wx.list.map(a => a.event) : []);   // NWS alerts the app already checks (js/10)
// Shore / Boat chips for one hour (Home card and Weather screen)
function wxdGoChips(w, h, lake) {
  const v = wxdVerdict(h, { ahead: w.hours, alerts: wxdAlertNames(), lake: lake || !w.marine });
  const chip = (name, x) => `<div class="wx-go-chip lvl-${x.level}" title="${wxdEsc(x.why.join(" · "))}"><span>${name}</span><b>${x.word}</b></div>`;
  return { v, html: chip("Shore", v.shore) + chip("Boat", v.boat) };
}
function openWeather() { showView("wx"); window.scrollTo({ top: 0 }); }

// ---- 🏠 Home weather card (weather plan step 4): follows the area now (GPS when allowed, else home waters) ----
// Sits at the top of the conditions card; the tide line and the wind · water · moon line below it are unchanged.
function wxdHomeStart() {
  const sec = $("hn-cond-sec"), cbtn = $("hn-cond"); if (!sec || !cbtn || $("hn-wx")) return;
  const top = el("div", "hn-wx"); top.id = "hn-wx";
  top.innerHTML = '<div class="hn-lab" id="hn-wx-lab">Weather</div>' +
    '<button type="button" class="hn-wx-now" id="hn-wx-now" aria-label="Open the full weather"><span class="hn-wx-ic" id="hn-wx-ic"></span>' +
    '<span class="hn-wx-tt"><span class="hn-wx-temp" id="hn-wx-temp">–</span><span class="hn-wx-sub" id="hn-wx-sub">Loading weather…</span></span></button>' +
    '<div class="wx-go" id="hn-wx-go"></div>';
  sec.insertBefore(top, cbtn);
  const tail = el("div", "hn-wx-tail");
  tail.innerHTML = '<div class="wx-hrs" id="hn-wx-hours"></div><button type="button" class="btn hn-wx-full" id="hn-wx-full">Full weather</button>';
  sec.appendChild(tail);
  $("hn-wx-now").addEventListener("click", openWeather);
  $("hn-wx-full").addEventListener("click", openWeather);
  const render = () => {
    const lat = LAT, lng = LNG, tz = typeof areaTz === "function" ? areaTz() : undefined;
    $("hn-wx-lab").textContent = "Weather · " + ((typeof area !== "undefined" && area.name) || "your area");
    wxdGet(lat, lng).then(w => {
      if (lat !== LAT || lng !== LNG) return;   // the area moved while this loaded
      const n = w.now, d0 = w.days.find(d => d.t + 86400000 > Date.now()) || w.days[0] || {};
      $("hn-wx-ic").innerHTML = wxdIcon(n.code, n.isDay, 44);
      $("hn-wx-temp").textContent = n.tempF != null ? n.tempF + "°" : "–";
      $("hn-wx-sub").textContent = [n.sky, n.feelsF != null ? `feels ${n.feelsF}°` : "", n.rainPct != null ? `rain ${n.rainPct}%` : "",
        d0.hiF != null ? `H ${d0.hiF}° L ${d0.loF}°` : ""].filter(Boolean).join(" · ") + (w.stale ? " · saved earlier" : "");
      $("hn-wx-go").innerHTML = wxdGoChips(w, wxdNowHour(w)).html;
      const now = Date.now(), next = w.hours.filter(h => h.t > now - 3600000).slice(0, 6);
      $("hn-wx-hours").innerHTML = next.map((h, i) => `<div class="wx-hr"><span>${i ? wxdEsc(clock(new Date(h.t), tz).replace(":00", "")) : "Now"}</span>` +
        `${wxdIcon(h.code, h.isDay, 22)}<b>${h.tempF}°</b><span>${wxdDir(h.deg)} ${h.mph}</span></div>`).join("");
    }, () => { $("hn-wx-sub").textContent = "Couldn't load the weather — tides still work."; $("hn-wx-go").innerHTML = ""; });
  };
  window.wxdHomeRender = render;
  render();
  setInterval(render, 10 * 60000);
  const wn = $("wx-now"); if (wn) new MutationObserver(render).observe(wn, { childList: true, characterData: true, subtree: true });   // the area moved (js/29 reloads the weather)
}
