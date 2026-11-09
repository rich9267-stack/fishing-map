// ---- 🌊 Tides + Water & waves (weather plan step 7; Project doc claude/weather-plan.md; layout canvas board 3 "Weather bottom") ----
// Loaded only when the Weather screen opens (js/48 LAZY_CODE "wx", after js/77). Two cards below the wind / pressure cards:
//  • Tides: the same tide line as Home (js/63 tideCurveSvg), 6 AM today to 6 AM tomorrow, + the next 4 highs and lows with feet.
//    The area now = window.homeTides (js/01, its station = STATION); a spot = its own station (js/02 stationFor / stationTides) moved by
//    its tide timing; lakes and freshwater spots have no Tides card.
//  • Water & waves: tiles for water temp (js/02 waterTempNow: station → ocean model → satellite), waves, swell, UV, rip currents, visibility.
//    Waves, swell and rip currents are hidden at lakes (and waves/swell when the ocean forecast has nothing for the place).
const WXW_H = 3600000;

// UV words (the US EPA / WHO scale)
const wxwUvWord = uv => uv == null ? "" : uv < 3 ? "Low" : uv < 6 ? "Moderate" : uv < 8 ? "High" : uv < 11 ? "Very high" : "Extreme";
// The UV for today (or tomorrow once today's strong sun is over): { label, uv, word, from, to } — from/to = the hours with UV 3 or more
function wxwUv(w, now, tz) {
  const pick = off => {
    const d0 = +tzDayStart(new Date(now + off * 86400000), tz), d1 = d0 + 86400000;
    const hrs = w.hours.filter(h => h.t >= d0 && h.t < d1 && h.uv != null);
    const day = w.days.find(d => Math.abs(d.t - d0) < 12 * WXW_H);
    const top = day && day.uv != null ? day.uv : hrs.length ? Math.max(...hrs.map(h => h.uv)) : null;
    const strong = hrs.filter(h => h.uv >= 3);
    return { top, from: strong.length ? strong[0].t : null, to: strong.length ? strong[strong.length - 1].t + WXW_H : null };
  };
  let x = pick(0), label = "UV";
  if (x.to != null && x.to <= now) { const y = pick(1); if (y.top != null) { x = y; label = "UV TOMORROW"; } }
  return Object.assign(x, { label, uv: x.top == null ? null : Math.round(x.top), word: wxwUvWord(x.top) });
}
// Waves over the next 6 hours: "4–5 ft" (or "2 ft"); null when there is no wave forecast
function wxwRange(vals) {
  const v = vals.filter(x => x != null && isFinite(x));
  if (!v.length) return null;
  const lo = Math.round(Math.min(...v)), hi = Math.round(Math.max(...v));
  if (hi < 1) return "Under 1 ft";
  return lo === hi || (lo < 1 && hi === 1) ? hi + " ft" : `${lo < 1 ? "<1" : lo}–${hi} ft`;
}
// Fog in the next 12 hours? The first hour with fog or under 1 mile of visibility
function wxwFog(w, now) {
  return w.hours.find(h => h.t >= now - WXW_H && h.t <= now + 12 * WXW_H && ((h.code === 45 || h.code === 48) || (h.visMi != null && h.visMi < 1))) || null;
}
// Rip currents from the NWS alerts for the chosen place (v270: its land zone + nearest marine zone, js/75 p.alerts; else the app-wide list)
function wxwRip(names) {
  const n = (names || []).map(x => String(x));
  if (n.some(x => /rip current/i.test(x))) return { word: "High risk", lvl: "bad", sub: "NWS rip current statement" };
  if (n.some(x => /beach hazard/i.test(x))) return { word: "Take care", lvl: "warn", sub: "NWS beach hazards alert" };
  return { word: "No alert", lvl: "", sub: "no NWS beach alert now" };
}

function wxwTile(id, head, big, sub, lvl) {
  const t = el("div", "wxw-tile" + (lvl ? " lvl-" + lvl : "")); t.id = id;
  t.append(el("span", "wxw-h", head), el("b", "wxw-big", big), el("span", "wxw-sub", sub || ""));
  return t;
}

// ---- Tides card ----
function wxwTides(p) {
  const sec = el("div", "wx-sec wxw-tides"); sec.id = "wx-tides";
  const head = el("div", "wxh-head"); const src = el("span", null, ""); src.id = "wxw-tide-src";
  head.append(el("b", null, "Tides"), src); sec.appendChild(head);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "hn-graph wxw-graph"); svg.id = "wxw-graph"; svg.setAttribute("viewBox", "0 0 340 118");
  svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "Tide from 6 AM today to 6 AM tomorrow");
  const list = el("div", "wxw-list"); list.id = "wxw-list";
  const note = el("div", "spot-meta"); note.id = "wxw-tide-note";
  sec.append(svg, list, note);
  const draw = (tides, from) => {
    const now = Date.now(), d0 = +tzDayStart(new Date(now), p.tz), t0 = d0 + 6 * WXW_H, t1 = t0 + 24 * WXW_H;
    svg.innerHTML = tideCurveSvg(tides, t0, t1, [["6a", t0], ["12p", t0 + 6 * WXW_H], ["6p", t0 + 12 * WXW_H], ["12a", t0 + 18 * WXW_H], ["6a", t1]], now);
    src.textContent = from || "";
    list.innerHTML = "";
    tides.filter(x => +x.when > now).slice(0, 4).forEach(x => {
      const r = el("span", "wxw-tide " + (x.high ? "hi" : "lo"));
      r.append(el("b", null, x.high ? "High" : "Low"), document.createTextNode(` ${clock(new Date(x.when), p.tz)}${isFinite(x.ft) ? ` · ${x.ft.toFixed(1)} ft` : ""}`));
      const d = tzDayDiff(new Date(x.when), p.tz); if (d > 0) r.appendChild(el("small", null, d === 1 ? " tomorrow" : " " + new Date(x.when).toLocaleDateString([], { weekday: "short", timeZone: tzGood(p.tz) })));
      list.appendChild(r);
    });
    if (!svg.innerHTML) note.textContent = "Tide times are loading or not available for today.";
    else note.textContent = p.spot && p.spot.tide_offset_min ? `Moved ${Math.abs(p.spot.tide_offset_min)} min ${p.spot.tide_offset_min > 0 ? "later" : "earlier"} for this spot (its tide timing).` : "";
  };
  const stName = id => { try { const s = tideAll().find(t => t.id === id); return s ? s.name + " station" : ""; } catch (e) { return ""; } };
  if (!p.spot) {
    const t = Array.isArray(window.homeTides) ? window.homeTides : null;
    if (t) draw(t, stName(typeof STATION !== "undefined" ? STATION : ""));
    else note.textContent = "Tide times aren't loaded yet.";
  } else {
    note.textContent = "Loading tide times…";
    try {
      const st = stationFor(p.spot);
      stationTides(st.id).then(t => { draw(shiftTides(t, p.spot.tide_offset_min || 0), `${st.name} station${st.dist != null && st.dist >= 0.1 ? ` · ${st.dist.toFixed(1)} mi` : ""}`); },
        () => { note.textContent = "Tide times unavailable for this spot."; });
    } catch (e) { note.textContent = "Tide times unavailable for this spot."; }
  }
  return sec;
}

// ---- Water & waves card ----
function wxwWater(w, p) {
  const sec = el("div", "wx-sec wxw-water"); sec.id = "wx-water";
  sec.appendChild(el("div", "wxh-head")).appendChild(el("b", null, "Water & waves"));
  const grid = el("div", "wxw-grid"); sec.appendChild(grid);
  const now = Date.now(), n = w.now || {}, lake = !!p.lake, next6 = w.hours.filter(h => h.t >= now - WXW_H && h.t < now + 6 * WXW_H);
  // water temp: the station or ocean model the rest of the app uses; the marine forecast's own number until it answers
  const wt = wxwTile("wxw-wt", "WATER TEMP", lake ? "–" : n.waterF != null ? Math.round(n.waterF) + "°" : "…", lake ? "no lake readings here" : n.waterF != null ? "ocean estimate" : "loading…");
  grid.appendChild(wt);
  if (!lake && typeof waterTempNow === "function") {
    waterTempNow(p.lat, p.lng).then(v => {
      if (!v || !isFinite(v.f)) return;
      wt.querySelector(".wxw-big").textContent = Math.round(v.f) + "°";
      wt.querySelector(".wxw-sub").textContent = v.source === "ocean model" ? "ocean estimate" : v.source === "satellite" ? "satellite estimate" : v.source;
    }, () => { if (n.waterF == null) { wt.querySelector(".wxw-big").textContent = "–"; wt.querySelector(".wxw-sub").textContent = "not available here"; } });
  }
  // waves + swell (sea only)
  const sea = !lake && !!w.marine && n.waveFt != null;
  if (sea) {
    const wr = wxwRange(next6.map(h => h.waveFt)) || "–";
    grid.appendChild(wxwTile("wxw-waves", "WAVES", wr, [n.wavePer ? `every ${n.wavePer} sec` : "", n.waveDeg != null ? "from " + wxdDir(n.waveDeg) : ""].filter(Boolean).join(" · ")));
    grid.appendChild(wxwTile("wxw-swell", "SWELL", n.swellFt != null ? (n.swellFt < 1 ? "Under 1 ft" : Math.round(n.swellFt) + " ft") : "–",
      [n.swellPer ? `every ${n.swellPer} sec` : "", n.swellDeg != null ? "from " + wxdDir(n.swellDeg) : ""].filter(Boolean).join(" · ")));
  }
  // UV
  const uv = wxwUv(w, now, p.tz);
  const short = t => clock(new Date(t), p.tz).replace(":00", "");
  grid.appendChild(wxwTile("wxw-uv", uv.label, uv.uv == null ? "–" : `${uv.uv} · ${uv.word}`,
    uv.uv == null ? "" : uv.from != null ? `sunscreen ${short(uv.from)}–${short(uv.to)}` : "low all day", uv.uv >= 8 ? "bad" : uv.uv >= 6 ? "warn" : ""));
  // rip currents (coast only)
  let us = true; try { if (typeof stateOf === "function") us = !!stateOf(p.lat, p.lng); } catch (e) { us = true; }
  if (!lake && us) {   // NWS alerts only exist in the US
    const r = wxwRip(Array.isArray(p.alerts) ? p.alerts : typeof wxdAlertNames === "function" ? wxdAlertNames() : []);
    grid.appendChild(wxwTile("wxw-rip", "RIP CURRENTS", r.word, r.sub, r.lvl));
  }
  // visibility
  const fog = wxwFog(w, now), vis = n.visMi;
  grid.appendChild(wxwTile("wxw-vis", "VISIBILITY", vis == null ? "–" : vis >= 10 ? "10+ mi" : vis < 1 ? "Under 1 mi" : Math.round(vis) + " mi",
    fog ? (fog.t <= now ? "fog now" : `fog likely around ${short(fog.t)}`) : "no fog expected", fog ? "warn" : ""));
  if (lake) sec.appendChild(el("div", "spot-meta", "Lakes and canals: waves, swell and rip currents are hidden."));
  else if (!sea) sec.appendChild(el("div", "spot-meta", "No wave forecast for this place."));
  return sec;
}

// Both cards, in screen order. w = wxdGet forecast, p = the place (js/75 wxsPlace).
function wxwSections(w, p) {
  const out = [];
  if (!(p.lake || (p.spot && p.spot.water_type === "freshwater"))) out.push(wxwTides(p));
  out.push(wxwWater(w, Object.assign({}, p, { lake: p.lake || (p.spot && p.spot.water_type === "freshwater") })));
  return out;
}
