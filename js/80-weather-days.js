// ---- 📅 Next 10 days (weather plan step 9; Project doc claude/weather-plan.md; layout canvas board 3 "Weather bottom") ----
// Loaded only when the Weather screen opens (js/48 LAZY_CODE "wx", after js/79). One card below Sun, moon & feeding times, for the chosen place:
//  • one row per day: day name, sky picture, rain %, low–high temperature bar, wind direction + mph, a 0–10 day score
//  • day score = js/69 fcDayScore (moon + feeding times near sunrise/sunset + that day's tide swing) + that day's wind (WXDY_WIND)
//  • tap a day: its hours (every 3 hours), its tides (line + highs/lows), sunrise/sunset and why the score
//  • days 8–10 are greyed: "rougher guesses"
// Data: the forecast the screen already has (wxdGet, js/74: 10 days of daily numbers, 48 hours of hours). Hours further out are asked of
// Open-Meteo only when such a day is tapped (kept 30 min, not saved). Tides: one NOAA call for 11 days per station (kept 6 h); none at lakes
// or when no station is within 30 miles of the spot.
const WXDY_H = 3600000, WXDY_D = 86400000;
// The wind part of the day score (mph). Same spirit as the Go / stay rules (js/74 WXD_LIMITS).
const WXDY_WIND = { calm: 10, windy: 16, windyGust: 26, rough: 25, roughGust: 35, calmAdd: 0.5, windySub: 1.5, roughSub: 3 };
const wxdyTideMem = {}, wxdyHourMem = {};

// The tide station for the place: your area = Home's station; a spot = its nearest station within 30 miles (moved by its tide timing); none at lakes
function wxdyStation(p) {
  if (p.lake) return null;
  try {
    if (!p.spot) {
      if (typeof STATION === "undefined" || !STATION) return null;
      const s = tideAll().find(t => t.id === STATION);
      return { id: STATION, name: s ? s.name : "", off: 0 };
    }
    const st = stationFor(p.spot);
    if (!st || st.dist == null || st.dist > 30) return null;
    return { id: st.id, name: st.name, off: p.spot.tide_offset_min || 0 };
  } catch (e) { return null; }
}
// 11 days of highs/lows for a station (from yesterday, UTC dates like the rest of the app)
function wxdyTides(id) {
  const m = wxdyTideMem[id];
  if (m && Date.now() - m.at < 6 * WXDY_H) return m.p;
  const start = new Date(Date.now() - WXDY_D);
  const url = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&application=fishing_map" +
    `&begin_date=${ymdUtc(start)}&range=264&datum=MLLW&station=${id}&time_zone=gmt&units=english&interval=hilo&format=json`;
  const slot = wxdyTideMem[id] = { at: Date.now() };
  slot.p = fetch(url).then(r => r.json()).then(d => {
    if (!d || !d.predictions || !d.predictions.length) throw new Error("No tide data");
    return d.predictions.map(x => ({ when: parseNoaa(x.t), high: x.type === "H", ft: parseFloat(x.v) }));
  }).catch(e => { delete wxdyTideMem[id]; throw e; });
  return slot.p;
}
// Moved by the spot's tide timing + the biggest one-day swing (fcDayScore compares each day with it)
function wxdyTideList(raw, off, tz) {
  const list = off ? raw.map(t => ({ ...t, when: new Date(+t.when + off * 60000) })) : raw.slice();
  const byDay = {}; list.forEach(t => { const k = tzDayKey(t.when, tz); (byDay[k] = byDay[k] || []).push(t.ft); });
  list.swingMax = Math.max(0, ...Object.values(byDay).map(v => v.length > 1 ? Math.max(...v) - Math.min(...v) : 0));
  return list;
}

// The day's score: moon + tide (js/69) + that day's wind. day = one of w.days.
function wxdyScore(day, p, tides) {
  const tp = tzParts(new Date(day.t + 12 * WXDY_H), p.tz);
  let r;
  try { r = fcDayScore(tp.y, tp.m - 1, tp.d, tides || null, { lat: p.lat, lng: p.lng, tz: p.tz }); } catch (e) { r = { score: 5, why: [] }; }
  let s = r.score; const why = r.why.slice(), W = WXDY_WIND, mph = day.mph, g = day.gust;
  if ((mph != null && mph >= W.rough) || (g != null && g >= W.roughGust)) { s -= W.roughSub; why.push(`Very windy (${mph} mph${g != null ? `, gusts ${g}` : ""})`); }
  else if ((mph != null && mph >= W.windy) || (g != null && g >= W.windyGust)) { s -= W.windySub; why.push(`Windy (${mph} mph${g != null ? `, gusts ${g}` : ""})`); }
  else if (mph != null && mph <= W.calm) { s += W.calmAdd; why.push(`Light wind (${mph} mph)`); }
  const score = Math.max(0, Math.min(10, Math.round(s)));
  return { score, word: score >= 8 ? "Great" : score >= 6 ? "Good" : score >= 4 ? "Fair" : "Slow", why, base: r.score };
}

// Hours for days past the screen's 48: one Open-Meteo call for 10 days of hours, only when such a day is tapped
function wxdyMoreHours(p) {
  const key = p.lat.toFixed(2) + "," + p.lng.toFixed(2), m = wxdyHourMem[key];
  if (m && Date.now() - m.at < 30 * 60000) return m.p;
  const url = "https://api.open-meteo.com/v1/forecast?" +
    `latitude=${p.lat.toFixed(3)}&longitude=${p.lng.toFixed(3)}&timeformat=unixtime&timezone=${encodeURIComponent(p.tz || "auto")}` +
    "&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m,wind_gusts_10m,wind_direction_10m,is_day" +
    "&forecast_days=10&wind_speed_unit=mph&temperature_unit=fahrenheit";
  const slot = wxdyHourMem[key] = { at: Date.now() };
  slot.p = fetch(url).then(r => { if (!r.ok) throw new Error("weather " + r.status); return r.json(); }).then(fc => {
    const h = fc && fc.hourly; if (!h || !h.time) throw new Error("no hours");
    return h.time.map((t, i) => ({ t: t * 1000, tempF: wxdR(h.temperature_2m[i]), code: h.weather_code[i], rainPct: wxdR(h.precipitation_probability ? h.precipitation_probability[i] : null),
      mph: wxdR(h.wind_speed_10m[i]), gust: wxdR(h.wind_gusts_10m ? h.wind_gusts_10m[i] : null), deg: wxdR(h.wind_direction_10m[i]), isDay: h.is_day ? !!h.is_day[i] : null }));
  }).catch(e => { delete wxdyHourMem[key]; throw e; });
  return slot.p;
}
// Every 3 hours of the day (12a, 3a … 9p) from a list of hours
function wxdyEvery3(hours, d0) {
  const out = [];
  for (let k = 0; k < 8; k++) { const t = d0 + k * 3 * WXDY_H, x = hours.find(h => Math.abs(h.t - t) < 40 * 60000); if (x) out.push(x); }
  return out;
}
const wxdyShortHour = (t, tz) => clock(new Date(t), tz).replace(/:00 /, " ").replace(/ ?([AP])M/, (m, a) => a.toLowerCase());

function wxdySection(w, p) {
  const sec = el("div", "wx-sec wxdy-card"); sec.id = "wx-days";
  const head = el("div", "wxh-head"); head.append(el("b", null, "Next 10 days"), el("span", null, "fishing score from moon + tide + wind"));
  sec.appendChild(head);
  const list = el("div", "wxdy-list"); list.id = "wxdy-list"; sec.appendChild(list);
  const now = Date.now(), i0 = Math.max(0, w.days.findIndex(d => d.t + WXDY_D > now));
  const days = w.days.slice(i0, i0 + 10);
  if (!days.length) { list.appendChild(el("div", "spot-meta", "The 10-day forecast isn't available right now.")); return sec; }
  const los = days.map(d => d.loF).filter(v => v != null), his = days.map(d => d.hiF).filter(v => v != null);
  const tLo = los.length ? Math.min(...los) : 0, tHi = his.length ? Math.max(...his) : 1, tSpan = Math.max(1, tHi - tLo);
  const st = wxdyStation(p);
  let tides = null, open = -1;
  const note = el("div", "spot-meta wxdy-note"); note.id = "wxdy-note";

  const panel = (d, i, sc) => {
    const box = el("div", "wxdy-panel"); box.id = "wxdy-panel";
    const d0 = +tzDayStart(new Date(d.t + 12 * WXDY_H), p.tz), d1 = d0 + WXDY_D;
    // the day in one line + sun
    let rise = d.sunrise, set = d.sunset;
    if (!rise || !set) { try { const t = SunCalc.getTimes(new Date(d0 + 12 * WXDY_H), p.lat, p.lng); rise = rise || (isFinite(t.sunrise) ? +t.sunrise : null); set = set || (isFinite(t.sunset) ? +t.sunset : null); } catch (e) { /* no sun */ } }
    const sum = el("div", "wxdy-sum"); sum.id = "wxdy-sum";
    sum.textContent = [wxdSky(d.code), d.hiF != null ? `High ${d.hiF}° · Low ${d.loF}°` : "", d.rainPct != null ? `rain ${d.rainPct}%` : "",
      d.mph != null ? `wind from ${wxdDir(d.deg)} up to ${d.mph} mph${d.gust != null ? `, gusts ${d.gust}` : ""}` : "",
      rise ? `sunrise ${clock(new Date(rise), p.tz)}` : "", set ? `sunset ${clock(new Date(set), p.tz)}` : ""].filter(Boolean).join(" · ");
    box.appendChild(sum);
    // hours
    box.appendChild(el("div", "hn-lab", "HOURS"));
    const strip = el("div", "wxdy-hours"); strip.id = "wxdy-hours"; box.appendChild(strip);
    const fill = hrs => {
      strip.innerHTML = "";
      const pick = wxdyEvery3(hrs, d0);
      if (!pick.length) { strip.appendChild(el("div", "spot-meta", "No hours for that day.")); return; }
      pick.forEach(h => {
        const c = el("div", "wxdy-hr" + (h.t + 3 * WXDY_H < now ? " past" : ""));
        c.appendChild(el("span", "wxdy-hr-t", wxdyShortHour(h.t, p.tz)));
        const ic = el("span"); ic.innerHTML = wxdIcon(h.code, h.isDay, 22); c.appendChild(ic);
        c.append(el("b", null, h.tempF != null ? h.tempF + "°" : "–"), el("span", "wxdy-hr-r", h.rainPct != null ? h.rainPct + "%" : ""),
          el("span", "wxdy-hr-w", h.mph != null ? `${wxdDir(h.deg)} ${h.mph}` : ""));
        strip.appendChild(c);
      });
    };
    const have = w.hours.filter(h => h.t >= d0 && h.t < d1);
    if (have.some(h => h.t >= d0 + 21 * WXDY_H)) fill(have);
    else {
      strip.appendChild(el("div", "spot-meta", "Loading the hours…"));
      wxdyMoreHours(p).then(hrs => { if (open === i) fill(hrs); },
        () => { if (open === i) { strip.innerHTML = ""; strip.appendChild(el("div", "spot-meta", navigator.onLine === false ? "The hours for that day need a signal." : "Couldn't load the hours for that day.")); } });
    }
    // tides
    if (st) {
      box.appendChild(el("div", "hn-lab", "TIDES" + (st.name ? " · " + st.name.toUpperCase() : "")));
      const day = tides ? tides.filter(t => +t.when >= d0 && +t.when < d1) : [];
      if (!tides) box.appendChild(el("div", "spot-meta", "Loading tide times…"));
      else if (!day.length) box.appendChild(el("div", "spot-meta", "No tide times for that day."));
      else {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "hn-graph wxdy-graph"); svg.id = "wxdy-graph"; svg.setAttribute("viewBox", "0 0 340 118");
        svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "Tide that day");
        svg.innerHTML = tideCurveSvg(tides, d0, d1, [["12a", d0], ["6a", d0 + 6 * WXDY_H], ["12p", d0 + 12 * WXDY_H], ["6p", d0 + 18 * WXDY_H], ["12a", d1]], i === 0 ? now : null);
        if (svg.innerHTML) box.appendChild(svg);
        const tl = el("div", "wxw-list wxdy-tides"); tl.id = "wxdy-tides";
        day.forEach(x => { const r = el("span", "wxw-tide " + (x.high ? "hi" : "lo")); r.append(el("b", null, x.high ? "High" : "Low"), document.createTextNode(` ${clock(new Date(x.when), p.tz)}${isFinite(x.ft) ? ` · ${x.ft.toFixed(1)} ft` : ""}`)); tl.appendChild(r); });
        box.appendChild(tl);
        if (st.off) box.appendChild(el("div", "spot-meta", `Moved ${Math.abs(st.off)} min ${st.off > 0 ? "later" : "earlier"} for this spot (its tide timing).`));
      }
    }
    // why the score
    box.appendChild(el("div", "hn-lab", `DAY SCORE ${sc.score} · ${sc.word.toUpperCase()}`));
    const why = el("div", "wxdy-why"); why.id = "wxdy-why";
    sc.why.forEach(t => why.appendChild(el("div", null, "• " + t)));
    box.appendChild(why);
    if (i >= 7) box.appendChild(el("div", "spot-meta", "This far ahead the forecast is a rougher guess — check again closer to the day."));
    return box;
  };

  const draw = () => {
    list.innerHTML = "";
    days.forEach((d, i) => {
      const sc = wxdyScore(d, p, tides);
      const row = el("button", "wxdy-row" + (i >= 7 ? " rough" : "") + (open === i ? " open" : "")); row.type = "button"; row.id = "wxdy-row" + i;
      row.setAttribute("aria-expanded", String(open === i)); row.dataset.lvl = sc.word.toLowerCase();
      const name = i === 0 ? "Today" : new Date(d.t + 12 * WXDY_H).toLocaleDateString([], { weekday: "short", timeZone: tzGood(p.tz) });
      const ic = el("span", "wxdy-ic"); ic.innerHTML = wxdIcon(d.code, true, 22);
      const bar = el("span", "wxdy-bar");
      if (d.loF != null && d.hiF != null) {
        const x = (d.loF - tLo) / tSpan * 100, wd = Math.max(4, (d.hiF - d.loF) / tSpan * 100);
        bar.innerHTML = `<svg viewBox="0 0 100 8" width="100%" height="8" preserveAspectRatio="none" role="img" aria-label="${d.loF} to ${d.hiF} degrees"><rect x="0" y="2" width="100" height="4" rx="2" class="wxdy-track"/><rect x="${x.toFixed(1)}" y="2" width="${Math.min(100 - x, wd).toFixed(1)}" height="4" rx="2" class="wxdy-fill"/></svg>`;
      }
      row.append(el("b", "wxdy-name", name), ic, el("span", "wxdy-rain" + (d.rainPct != null && d.rainPct >= 20 ? " wet" : ""), d.rainPct != null ? d.rainPct + "%" : "–"),
        el("span", "wxdy-lo", d.loF != null ? d.loF + "°" : ""), bar, el("span", "wxdy-hi", d.hiF != null ? d.hiF + "°" : ""),
        el("span", "wxdy-wind", d.mph != null ? `${wxdDir(d.deg)} ${d.mph}` : "–"), el("b", "wxdy-score", String(sc.score)));
      row.addEventListener("click", () => { open = open === i ? -1 : i; draw(); });
      list.appendChild(row);
      if (open === i) list.appendChild(panel(d, i, sc));
    });
  };
  draw();
  sec.appendChild(note);
  sec.appendChild(el("div", "spot-meta", "Tap a day for its hours and tides. Days 8–10 are rougher guesses and are shown in grey. The score is a help, not a promise."));
  if (st) {
    wxdyTides(st.id).then(raw => { tides = wxdyTideList(raw, st.off, p.tz); draw(); },
      () => { note.textContent = "Tide times couldn't load — the scores use the moon and wind only."; tides = []; draw(); });
  } else note.textContent = p.lake ? "Lake or canal: no tides, the score uses the moon and wind." : "No tide station nearby: the score uses the moon and wind.";
  return sec;
}
