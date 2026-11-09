// ---- 🌦 Hour by hour, 48 hours (weather plan step 5; Project doc claude/weather-plan.md; layout canvas board 2) ----
// Loaded only when the Weather screen opens (js/48 LAZY_CODE "wx", after js/75). One swipeable strip: a small line chart on top
// (Wind / Temp / Rain / Waves tabs) lined up with one column per hour (time, sky picture, temp, rain %, wind arrow + mph, gusts)
// and marks for high/low tide, sunrise/sunset and major/minor feeding times.
// Tides: the area now = window.homeTides (js/01); a spot = its own station (js/02 stationTides + its tide timing); lakes have none.
const WXH_TAB_KEY = "fm-wx-tab", WXH_COL = 58, WXH_CHART_H = 64;
const WXH_TABS = [["wind", "Wind"], ["temp", "Temp"], ["rain", "Rain"], ["waves", "Waves"]];
function wxhTab(canWaves) {
  let t = null; try { t = localStorage.getItem(WXH_TAB_KEY); } catch (e) {}
  return WXH_TABS.some(x => x[0] === t) && (t !== "waves" || canWaves) ? t : "wind";
}
const wxhShort = (t, tz) => clock(new Date(t), tz).replace(":00", "");

// Every mark in the 48 hours: { t, kind: high|low|sunrise|sunset|major|minor, start, end }
function wxhMarks(hours, p, tides) {
  if (!hours.length) return [];
  const a = hours[0].t, b = hours[hours.length - 1].t + 3600000, out = [];
  (tides || []).forEach(x => { const t = +x.when; if (t >= a && t < b) out.push({ t, kind: x.high ? "high" : "low", ft: x.ft }); });
  const seen = new Set();
  for (let d = -1; d <= 2; d++) {
    const day = new Date(a + d * 86400000), d0 = tzDayStart(day, p.tz), noon = new Date(+d0 + 12 * 3600000);
    try {
      const s = SunCalc.getTimes(noon, p.lat, p.lng);
      [["sunrise", s.sunrise], ["sunset", s.sunset]].forEach(([k, v]) => { if (v && isFinite(v) && +v >= a && +v < b && !seen.has(k + +v)) { seen.add(k + +v); out.push({ t: +v, kind: k }); } });
    } catch (e) { /* no sun data */ }
    try {
      solunarPeriods(day, p.lat, p.lng, p.tz).forEach(x => {
        const t = +x.center, key = x.type + Math.round(t / 600000);
        if (+x.end >= a && +x.start < b && !seen.has(key)) { seen.add(key); out.push({ t, kind: x.type, start: +x.start, end: +x.end }); }
      });
    } catch (e) { /* no moon data */ }
  }
  return out.sort((x, y) => x.t - y.t);
}
const WXH_MARK = { high: "High", low: "Low", sunrise: "Sunrise", sunset: "Sunset", major: "Major feed", minor: "Minor feed" };

// The small chart for one tab, as SVG text lined up with the columns
function wxhChart(hours, tab) {
  const W = hours.length * WXH_COL, H = WXH_CHART_H, top = 8, bot = 6;
  const pick = { wind: [h => h.mph, h => h.gust], temp: [h => h.tempF, h => h.feelsF], rain: [h => h.rainPct], waves: [h => h.waveFt, h => h.swellFt] }[tab];
  const series = pick.map(f => hours.map(f));
  const vals = series.flat().filter(v => v != null && isFinite(v));
  if (!vals.length) return `<svg class="wxh-chart" width="${W}" height="${H}" aria-hidden="true"></svg>`;
  let lo = tab === "rain" ? 0 : Math.min(...vals), hi = tab === "rain" ? 100 : Math.max(...vals);
  if (tab === "wind" || tab === "waves") lo = 0;
  if (hi - lo < 1) hi = lo + 1;
  const x = i => i * WXH_COL + WXH_COL / 2, y = v => top + (H - top - bot) * (1 - (v - lo) / (hi - lo));
  let d = "";
  if (tab === "rain") {
    d = series[0].map((v, i) => v == null ? "" : `<rect x="${x(i) - 9}" y="${y(v).toFixed(1)}" width="18" height="${(H - bot - y(v)).toFixed(1)}" rx="3" class="wxh-bar${v >= 50 ? " wet" : ""}"/>`).join("");
  } else {
    series.forEach((s, k) => {
      let path = "", pen = false;
      s.forEach((v, i) => { if (v == null) { pen = false; return; } path += (pen ? "L" : "M") + x(i) + " " + y(v).toFixed(1) + " "; pen = true; });
      if (path) d += `<path d="${path.trim()}" class="wxh-line${k ? " dash" : ""}"/>`;
    });
  }
  // the highest and lowest value of the main line, written on the chart
  const main = series[0], mx = main.reduce((m, v, i) => v != null && (m < 0 || v > main[m]) ? i : m, -1);
  const unit = { wind: "", temp: "°", rain: "%", waves: " ft" }[tab];
  if (mx >= 0) d += `<text x="${x(mx)}" y="${Math.max(7, y(main[mx]) - 3).toFixed(1)}" class="wxh-val" text-anchor="middle">${main[mx]}${unit}</text>`;
  return `<svg class="wxh-chart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${wxdEsc(WXH_TABS.find(t => t[0] === tab)[1])} for the next ${hours.length} hours">${d}</svg>`;
}
const WXH_LEGEND = { wind: "solid = wind · dashed = gusts (mph)", temp: "solid = temperature · dashed = feels like (°F)", rain: "bars = chance of rain (%)", waves: "solid = waves · dashed = swell (ft)" };

// Wind arrow: points the way the wind blows (it comes FROM deg)
const wxhArrow = deg => deg == null ? '<span class="wxh-noarrow">–</span>' :
  `<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21V4M6 10l6-6 6 6" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round" transform="rotate(${(deg + 180) % 360} 12 12)"/></svg>`;

function wxhColumns(hours, p, marks, tab, now) {
  const tz = p.tz;
  return hours.map((h, i) => {
    const end = h.t + 3600000, isNow = i === 0 && h.t <= now;
    const here = marks.filter(m => m.t >= h.t && m.t < end);
    const feed = marks.find(m => (m.kind === "major" || m.kind === "minor") && m.start < end && m.end > h.t);
    const time = isNow ? "Now" : wxhShort(h.t, tz);
    const midnight = /^12 AM$/.test(time);
    const dayLab = midnight ? new Date(h.t).toLocaleDateString([], { weekday: "short", timeZone: tzGood(tz) }) : "";
    let lab = here.map(m => `<span class="wxh-mk mk-${m.kind}" title="${wxdEsc(WXH_MARK[m.kind] + " " + clock(new Date(m.t), tz))}">${WXH_MARK[m.kind].replace(" feed", "")}</span>`).join("");
    if (isNow && p.tides && p.tides.length) {
      const nx = p.tides.find(x => +x.when > now);
      if (nx && !here.some(m => m.kind === "high" || m.kind === "low")) lab = `<span class="wxh-mk mk-tide">${nx.high ? "▲ tide" : "▼ tide"}</span>` + lab;
    }
    const wet = h.rainPct != null && h.rainPct >= 50;
    return `<div class="wxh-col${isNow ? " now" : ""}${midnight ? " newday" : ""}${feed ? " feed-" + feed.kind : ""}" data-t="${h.t}">` +
      `<span class="wxh-time">${midnight ? `<b>${wxdEsc(dayLab)}</b>` : wxdEsc(time)}</span>${wxdIcon(h.code, h.isDay, 26)}` +
      `<b class="wxh-temp">${h.tempF != null ? h.tempF + "°" : "–"}</b><span class="wxh-rain${wet ? " wet" : ""}">${h.rainPct != null ? h.rainPct + "%" : "–"}</span>` +
      `<span class="wxh-arrow" aria-label="from ${wxdEsc(wxdDir(h.deg))}">${wxhArrow(h.deg)}</span><span class="wxh-mph">${h.mph != null ? h.mph : "–"}</span>` +
      `<span class="wxh-gust">${h.gust != null ? "g" + h.gust : ""}</span>` +
      (tab === "waves" ? `<span class="wxh-wave">${h.waveFt != null ? h.waveFt + " ft" : "–"}</span>` : "") +
      `<span class="wxh-marks">${lab}</span></div>`;
  }).join("");
}

// The whole section. w = wxdGet forecast, p = the place (js/75 wxsPlace). Returns the element; fills in a spot's tides when they arrive.
function wxhSection(w, p) {
  const sec = el("div", "wx-sec wxh"); sec.id = "wx-hours";
  const now = Date.now(), hours = w.hours.filter(h => h.t > now - 3600000).slice(0, 48);
  const head = el("div", "wxh-head"); head.append(el("b", null, "Hour by hour"), el("span", null, `next ${hours.length} hours`));
  sec.appendChild(head);
  if (!hours.length) { sec.appendChild(el("div", "spot-meta", "No hourly forecast for this place right now.")); return sec; }
  const canWaves = !!w.marine && !p.lake && hours.some(h => h.waveFt != null);
  let tab = wxhTab(canWaves);
  const tabs = el("div", "wxh-tabs"); tabs.setAttribute("role", "group"); tabs.setAttribute("aria-label", "Chart");
  WXH_TABS.forEach(([k, name]) => {
    if (k === "waves" && !canWaves) return;
    const b = el("button", "wxh-tab", name); b.type = "button"; b.dataset.tab = k;
    b.addEventListener("click", () => { tab = k; try { localStorage.setItem(WXH_TAB_KEY, k); } catch (e) {} draw(); });
    tabs.appendChild(b);
  });
  sec.appendChild(tabs);
  const strip = el("div", "wxh-strip"); strip.id = "wxh-strip"; strip.tabIndex = 0; strip.setAttribute("aria-label", "Hour by hour, swipe for more");
  const inner = el("div", "wxh-inner"); inner.style.width = hours.length * WXH_COL + "px";
  strip.appendChild(inner); sec.appendChild(strip);
  const legend = el("div", "spot-meta wxh-legend"); sec.appendChild(legend);
  const key = el("div", "wxh-key");
  key.innerHTML = '<span><i class="k-tide"></i>tide</span><span><i class="k-sun"></i>sunrise / sunset</span><span><i class="k-major"></i>major feed</span><span><i class="k-minor"></i>minor feed</span>';
  sec.appendChild(key);
  const tideNote = el("div", "spot-meta wxh-tidenote"); sec.appendChild(tideNote);

  p = Object.assign({}, p, { tides: null });
  const draw = () => {
    [...tabs.children].forEach(b => { const on = b.dataset.tab === tab; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
    const marks = wxhMarks(hours, p, p.tides);
    inner.innerHTML = wxhChart(hours, tab) + `<div class="wxh-cols">${wxhColumns(hours, p, marks, tab, now)}</div>`;
    legend.textContent = WXH_LEGEND[tab] + " · swipe for 48 hours";
  };
  // tides
  if (!p.spot) {
    p.tides = Array.isArray(window.homeTides) ? window.homeTides : null;
    if (!p.tides) tideNote.textContent = "Tide times aren't loaded yet.";
  } else if (p.lake || p.spot.water_type === "freshwater") {
    tideNote.textContent = "No tides at a lake or freshwater spot.";
  } else {
    tideNote.textContent = "Loading tide times…";
    try {
      const st = stationFor(p.spot);
      stationTides(st.id).then(t => {
        p.tides = shiftTides(t, p.spot.tide_offset_min || 0);
        tideNote.textContent = `Tides from ${st.name}${st.dist != null ? ` (${st.dist < 0.1 ? "here" : st.dist.toFixed(1) + " mi"})` : ""}.`;
        if (sec.isConnected) draw();
      }, () => { tideNote.textContent = "Tide times unavailable for this spot."; });
    } catch (e) { tideNote.textContent = "Tide times unavailable for this spot."; }
  }
  draw();
  return sec;
}
