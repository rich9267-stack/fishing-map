// ---- 🌦 Wind dial + pressure card (weather plan step 6; Project doc claude/weather-plan.md; layout canvas board 2) ----
// Loaded only when the Weather screen opens (js/48 LAZY_CODE "wx", after js/76). Two cards side by side below Hour by hour:
//  • Wind: a dial with N/E/S/W, an arrow coming in from where the wind blows FROM, mph in the middle, "From E · gusts 22",
//    and onshore / offshore / cross for a spot that has a "water lies to the…" direction.
//  • Pressure: now in inHg, Rising / Falling / Steady, a small line of the last 12 h (solid) and the next 12 h (dashed), one fishing hint.
//    Last 12 h = National Weather Service station readings in the US (same stations and same ±0.03 inHg in 3 h rule as js/01 loadPressure);
//    elsewhere, or when no station answers, the forecast's own last 12 hours. Next 12 h = the forecast (wxdGet hours), moved up or down
//    so it joins the station's "now" reading.
const WXP_TTL = 15 * 60000, wxpMem = {};
const WXP_H = 3600000;

// The change over about 3 hours (anything 1.5–6 h back will do, scaled to 3 h). series = [{ t, inHg }] oldest first.
function wxpTrend(series) {
  const s = (series || []).filter(x => x.inHg != null);
  if (s.length < 2) return { trend: null, rate: null };
  const last = s[s.length - 1], target = last.t - 3 * WXP_H;
  const earlier = s.filter(x => x.t <= last.t - 1.5 * WXP_H && x.t >= last.t - 6 * WXP_H)
    .sort((a, b) => Math.abs(a.t - target) - Math.abs(b.t - target))[0];
  if (!earlier) return { trend: null, rate: null };
  const rate = (last.inHg - earlier.inHg) * (3 * WXP_H / (last.t - earlier.t));
  return { trend: rate >= 0.03 ? "rising" : rate <= -0.03 ? "falling" : "steady", rate: Math.round(rate * 1000) / 1000 };
}

// One general fishing hint for the pressure (patterns anglers use, not a promise)
function wxpHint(trend, rate, inHg) {
  if (trend === "falling") return rate != null && rate <= -0.06 ? "Falling fast: a front may be coming. Fish often feed hard before it — watch for storms." : "Fish often feed before a front.";
  if (trend === "rising") return rate != null && rate >= 0.06 ? "Rising fast after a front: bites are often slow. Try slower baits and deeper water." : "Rising: fish settle back in as the weather clears.";
  if (trend === "steady") return inHg != null && inHg >= 30.2 ? "High and steady: clear skies. Try early, late or deeper water." : "Steady: fish keep their usual habits.";
  return "";
}

// NWS stations near a place (US only). Near Pompano the two known airports (js/01 PRESSURE_STATIONS).
async function wxpStations(lat, lng) {
  if (typeof miles === "function" && miles(lat, lng, 26.24, -80.10) < 15 && typeof PRESSURE_STATIONS !== "undefined") return PRESSURE_STATIONS;
  const j = async u => { const r = await fetch(u, { headers: { Accept: "application/geo+json" } }); if (!r.ok) throw new Error("nws " + r.status); return r.json(); };
  const pt = await j(`https://api.weather.gov/points/${(+lat).toFixed(3)},${(+lng).toFixed(3)}`);
  const list = await j(pt.properties.observationStations);
  return (list.features || []).slice(0, 3).map(f => f.properties && f.properties.stationIdentifier).filter(Boolean);
}
// The last 12 hours of readings from the first station that has a fresh one: { st, series: [{ t, inHg }] } or null
function wxpStationPast(lat, lng) {
  const key = (+lat).toFixed(2) + "," + (+lng).toFixed(2), m = wxpMem[key];
  if (m && Date.now() - m.at < WXP_TTL) return m.p;
  let inUs = true;
  try { if (typeof stateOf === "function") inUs = !!stateOf(lat, lng); } catch (e) { inUs = true; }
  const p = !inUs ? Promise.resolve(null) : (async () => {
    const since = new Date(Date.now() - 12.5 * WXP_H).toISOString().replace(/\.\d+Z$/, "Z");
    for (const st of await wxpStations(lat, lng)) {
      try {
        const r = await fetch(`https://api.weather.gov/stations/${st}/observations?start=${encodeURIComponent(since)}`, { headers: { Accept: "application/geo+json" } });
        if (!r.ok) continue;
        const data = await r.json();
        const series = (data.features || []).map(f => {
          const pr = f.properties || {}, pa = pr.barometricPressure && pr.barometricPressure.value != null ? pr.barometricPressure.value : pr.seaLevelPressure && pr.seaLevelPressure.value;
          return { t: +new Date(pr.timestamp), inHg: pa == null ? null : Math.round(pa / 3386.39 * 100) / 100 };
        }).filter(x => x.inHg != null && isFinite(x.t)).sort((a, b) => a.t - b.t);
        if (!series.length || Date.now() - series[series.length - 1].t > 3 * WXP_H) continue;   // too old: try the next station
        if (series[series.length - 1].t - series[0].t < 3 * WXP_H) continue;                     // not enough hours for a line
        return { st, series };
      } catch (e) { /* try the next station */ }
    }
    return null;
  })().catch(() => null);
  wxpMem[key] = { at: Date.now(), p };
  return p;
}

// Everything the pressure card shows. w = wxdGet forecast; stn = wxpStationPast result or null.
function wxpData(w, stn, now) {
  now = now || Date.now();
  const fc = (w.hours || []).filter(h => h.inHg != null);
  const fcPast = fc.filter(h => h.t <= now && h.t >= now - 12 * WXP_H).map(h => ({ t: h.t, inHg: h.inHg }));
  const fcNowH = fc.filter(h => h.t <= now).pop() || fc[0];
  const fcNow = w.now && w.now.inHg != null ? w.now.inHg : fcNowH ? fcNowH.inHg : null;
  let past = fcPast, src = "forecast", nowIn = fcNow, st = null;
  if (stn && stn.series && stn.series.length) { past = stn.series.filter(x => x.t >= now - 12 * WXP_H); src = "station"; st = stn.st; nowIn = past[past.length - 1].inHg; }
  const base = fcNowH ? fcNowH.inHg : fcNow;   // the forecast hour at now, so the dashed line carries on from the station reading
  const shift = src === "station" && base != null && nowIn != null ? nowIn - base : 0;
  const next = fc.filter(h => h.t > now && h.t <= now + 12 * WXP_H).map(h => ({ t: h.t, inHg: Math.round((h.inHg + shift) * 100) / 100 }));
  const tr = wxpTrend(src === "station" ? past : fcPast);   // forecast: its own hourly readings only (the "current" value can sit a little off them)
  const trend = tr.trend || (src === "forecast" && w.now ? w.now.trend : null) || null;
  return { now: nowIn, trend, rate: tr.rate, past, next, src, st, hint: wxpHint(trend, tr.rate, nowIn) };
}

// The small line: −12 h … now … +12 h. Solid = what happened, dashed = the forecast.
function wxpChart(d, now) {
  const W = 140, H = 50, top = 4, bot = 12, all = d.past.concat(d.next).map(x => x.inHg);
  if (!all.length) return "";
  let lo = Math.min(...all), hi = Math.max(...all);
  if (hi - lo < 0.06) { const mid = (hi + lo) / 2; lo = mid - 0.03; hi = mid + 0.03; }
  const x = t => Math.max(0, Math.min(W, (t - (now - 12 * WXP_H)) / (24 * WXP_H) * W)), y = v => top + (H - top - bot) * (1 - (v - lo) / (hi - lo));
  const path = s => s.map((p, i) => (i ? "L" : "M") + x(p.t).toFixed(1) + " " + y(p.inHg).toFixed(1)).join(" ");
  const lastPast = d.past[d.past.length - 1];
  const nextS = lastPast && d.next.length ? [{ t: now, inHg: d.now != null ? d.now : lastPast.inHg }].concat(d.next) : d.next;
  return `<svg class="wxp-chart" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" role="img" aria-label="Pressure, last 12 hours and next 12 hours">` +
    (d.past.length > 1 ? `<path d="${path(d.past)}" class="wxp-past"/>` : "") +
    (nextS.length > 1 ? `<path d="${path(nextS)}" class="wxp-next"/>` : "") +
    `<line x1="70" x2="70" y1="2" y2="${H - bot + 2}" class="wxp-nowline"/>` +
    `<text x="0" y="${H - 1}" class="wxp-lab">−12 h</text><text x="70" y="${H - 1}" class="wxp-lab" text-anchor="middle">now</text><text x="${W}" y="${H - 1}" class="wxp-lab" text-anchor="end">+12 h</text></svg>`;
}

// Wind dial as SVG text. deg = where the wind comes FROM; the arrow sits on that side of the ring and points in, the way the wind blows.
function wxpDial(mph, deg, gust) {
  const c = 55, from = wxdDir(deg);
  const long = { N: "north", E: "east", S: "south", W: "west" }, say = from ? from.split("").map(k => long[k]).join("-") : "";
  let arrow = "";
  if (deg != null && isFinite(deg)) {
    const a = (deg - 90) * Math.PI / 180, pt = (r, off) => [c + r * Math.cos(a + off), c + r * Math.sin(a + off)].map(v => v.toFixed(1)).join(" ");
    arrow = `<path d="M${pt(22, 0)} L${pt(38, -0.3)} L${pt(38, 0.3)} Z" class="wxp-arrow"/>`;
  }
  const label = mph == null ? "Wind not available" : mph < 1 ? "Calm" : `Wind from the ${say || "?"}, ${mph} mph${gust != null ? `, gusts ${gust}` : ""}`;
  return `<svg class="wxp-dial" width="110" height="110" viewBox="0 0 110 110" role="img" aria-label="${wxdEsc(label)}">` +
    `<circle cx="55" cy="55" r="46" class="wxp-ring"/>` +
    `<text x="55" y="16" text-anchor="middle" class="wxp-cmp">N</text><text x="100" y="59" text-anchor="middle" class="wxp-cmp">E</text>` +
    `<text x="55" y="104" text-anchor="middle" class="wxp-cmp">S</text><text x="10" y="59" text-anchor="middle" class="wxp-cmp">W</text>` +
    arrow + `<text x="55" y="59" text-anchor="middle" class="wxp-mph">${mph == null ? "–" : mph}</text><text x="55" y="72" text-anchor="middle" class="wxp-unit">mph</text></svg>`;
}

// The section. w = wxdGet forecast, p = the place (js/75 wxsPlace). Draws straight away from the forecast; the station line comes in when it arrives.
function wxpSection(w, p) {
  const sec = el("div", "wx-sec wxp"); sec.id = "wx-windp";
  const n = w.now || {};
  // wind
  const wind = el("div", "wxp-card wxp-wind"); wind.id = "wxp-wind";
  wind.appendChild(el("span", "wxp-h", "WIND"));
  const dial = el("div", "wxp-dialbox"); dial.innerHTML = wxpDial(n.mph, n.deg, n.gust); wind.appendChild(dial);
  const wl = el("span", "wxp-from"); wl.id = "wxp-from";
  if (n.mph != null && n.mph < 1) wl.appendChild(el("b", null, "Calm"));
  else { wl.appendChild(el("b", null, n.dir ? "From " + n.dir : "Wind")); if (n.gust != null) wl.appendChild(document.createTextNode(" · gusts " + n.gust)); }
  wind.appendChild(wl);
  let kind = null;
  try { if (p.spot && p.spot.faces_deg != null && typeof windKind === "function") kind = windKind(n.deg, p.spot.faces_deg); } catch (e) { kind = null; }
  if (kind) { const k = el("span", "wxp-kind kind-" + kind, { onshore: "Onshore here (blowing in from the water)", offshore: "Offshore here (blowing out to the water)", cross: "Cross wind here" }[kind]); k.id = "wxp-kind"; wind.appendChild(k); }
  // pressure
  const pr = el("div", "wxp-card wxp-press"); pr.id = "wxp-press";
  const draw = stn => {
    const now = Date.now(), d = wxpData(w, stn, now);
    pr.innerHTML = "";
    pr.dataset.src = d.src;
    pr.appendChild(el("span", "wxp-h", "PRESSURE"));
    const big = el("b", "wxp-big"); big.id = "wxp-now";
    big.append(d.now != null ? d.now.toFixed(2) + " " : "– ", el("span", null, "inHg"));
    pr.appendChild(big);
    const word = { rising: "↗ Rising", falling: "↘ Falling", steady: "→ Steady" }[d.trend];
    const t = el("span", "wxp-trend tr-" + (d.trend || "none"), word || "Trend not known yet"); t.id = "wxp-trend"; pr.appendChild(t);
    const ch = el("div", "wxp-chartbox"); ch.innerHTML = wxpChart(d, now); pr.appendChild(ch);
    if (d.hint) { const h = el("span", "wxp-hint", d.hint); h.id = "wxp-hint"; pr.appendChild(h); }
    pr.appendChild(el("span", "wxp-src", d.src === "station" ? `Last 12 h: station ${d.st} · dashed = forecast` : "From the forecast · dashed = next 12 h"));
  };
  draw(null);
  wxpStationPast(p.lat, p.lng).then(stn => { if (stn) draw(stn); }, () => {});
  sec.append(wind, pr);
  return sec;
}
