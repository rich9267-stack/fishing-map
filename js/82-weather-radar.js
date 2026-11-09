// ---- 🌧 Rain radar (weather plan step 11; Project doc claude/weather-plan.md): NOAA's radar picture, last hour as a loop ----
// Source: NOAA/NWS radar mosaic (MRMS base reflectivity) from opengeo.ncep.noaa.gov as a Leaflet WMS layer. Free, public, no key.
// Regions: lower 48, Alaska, Hawaii, Puerto Rico/USVI (carib), Guam. Outside them nothing is asked and nothing shows.
// The loop: the server's list of scan times (GetCapabilities, kept 3 minutes) → about one picture every 10 minutes for the last hour.
// If that list can't be read, the newest picture shows on its own ("Latest radar", no loop).
// Used by: the Weather screen card (wxrSection, called from js/75) and the Map's 🌧 Rain radar layer (hidden #mx-radar button + Layers switch).
const WXR_REGIONS = [
  { id: "conus", box: [20, -130, 52, -60] },
  { id: "alaska", box: [50, -180, 72, -129] },
  { id: "hawaii", box: [18, -161, 23, -154] },
  { id: "carib", box: [17, -68, 19, -64] },
  { id: "guam", box: [13, 144, 15.5, 146] }];
const WXR_HOST = "https://opengeo.ncep.noaa.gov/geoserver/";
const WXR_LOOP_MIN = 60, WXR_STEP_MIN = 10, WXR_TIMES_TTL = 3 * 60000, WXR_TICK = 650, WXR_HOLD = 3, WXR_OPACITY = 0.7;
const wxrMem = {};
let wxrClock = () => Date.now();      // tests change this

// Which radar region a place is in (null = outside the US radar)
function wxrRegion(lat, lng) {
  if (!isFinite(lat) || !isFinite(lng)) return null;
  if (typeof wxaInUs === "function" && !wxaInUs(lat, lng)) return null;
  return WXR_REGIONS.find(r => lat >= r.box[0] && lat <= r.box[2] && lng >= r.box[1] && lng <= r.box[3]) || null;
}
function wxrUrl(r) { return `${WXR_HOST}${r.id}/${r.id}_bref_qcd/ows`; }

// The scan times the server has, as [{ t: ms, s: "the exact text the server wants back" }], newest last
function wxrParseTimes(xml, layer, now) {
  const at = xml.indexOf("<Name>" + layer + "</Name>"), part = at >= 0 ? xml.slice(at) : xml;
  const m = part.match(/<(?:Dimension|Extent)[^>]*name="time"[^>]*>([^<]*)</i);
  if (!m) return [];
  const out = [];
  m[1].trim().split(/\s*,\s*/).forEach(piece => {
    const r = piece.split("/");
    if (r.length === 3) {   // start/end/period, e.g. PT2M
      const a = Date.parse(r[0]), b = Date.parse(r[1]), pm = r[2].match(/PT(?:(\d+)H)?(?:(\d+)M)?/), step = pm ? ((+pm[1] || 0) * 60 + (+pm[2] || 0)) * 60000 : 0;
      if (isFinite(a) && isFinite(b) && step > 0) for (let t = Math.max(a, b - 2 * WXR_LOOP_MIN * 60000); t <= b; t += step) out.push({ t, s: new Date(t).toISOString() });
    } else { const t = Date.parse(piece); if (isFinite(t)) out.push({ t, s: piece }); }
  });
  return out.filter(x => x.t <= now + 10 * 60000).sort((a, b) => a.t - b.t);
}
// About one picture every 10 minutes for the last hour, newest last
function wxrPickFrames(times) {
  if (!times.length) return [];
  const last = times[times.length - 1].t, out = [];
  for (let k = WXR_LOOP_MIN / WXR_STEP_MIN; k >= 0; k--) {
    const want = last - k * WXR_STEP_MIN * 60000;
    let best = null;
    times.forEach(x => { if (x.t >= last - WXR_LOOP_MIN * 60000 - 60000 && (!best || Math.abs(x.t - want) < Math.abs(best.t - want))) best = x; });
    if (best && Math.abs(best.t - want) <= WXR_STEP_MIN * 30000 + 60000 && !out.some(o => o.t === best.t)) out.push(best);
  }
  return out;
}
async function wxrFrames(r) {
  const c = wxrMem[r.id];
  if (c && wxrClock() - c.at < WXR_TIMES_TTL) return c.frames;
  let frames = [];
  try {
    const res = await fetch(wxrUrl(r) + "?service=WMS&version=1.3.0&request=GetCapabilities");
    if (res.ok) frames = wxrPickFrames(wxrParseTimes(await res.text(), r.id + "_bref_qcd", wxrClock()));
  } catch (e) { frames = []; }
  wxrMem[r.id] = { at: wxrClock(), frames: frames };
  return frames;
}

// A radar loop on a Leaflet map: one WMS layer per picture, only the current one visible.
// opts: { label(text, i, n), paused }. Returns { stop(), toggle(), playing(), frames }.
function wxrLoop(lmap, r, frames, opts) {
  opts = opts || {};
  const list = frames.length ? frames : [null];   // null = newest picture, no time asked
  const layers = list.map((f, i) => {
    const o = { layers: r.id + "_bref_qcd", format: "image/png", transparent: true, opacity: i === list.length - 1 ? WXR_OPACITY : 0, tileSize: 512, zIndex: 450,
      attribution: "Radar: NOAA/NWS", className: "wxr-tiles" };
    if (f) o.time = f.s;
    return L.tileLayer.wms(wxrUrl(r), o).addTo(lmap);
  });
  let i = list.length - 1, hold = 0, on = list.length > 1 && !opts.paused, timer = null;
  const say = () => { if (opts.label) opts.label(list[i] ? list[i].t : null, i, list.length); };
  const show = k => { layers[i].setOpacity(0); i = k; layers[i].setOpacity(WXR_OPACITY); say(); };
  const tick = () => {
    if (!on || (opts.visible && !opts.visible())) return;
    if (i === list.length - 1 && hold < WXR_HOLD) { hold++; return; }   // stay a moment on the newest picture
    hold = 0; show((i + 1) % list.length);
  };
  if (list.length > 1) timer = setInterval(tick, WXR_TICK);
  say();
  return {
    frames: list,
    playing: () => on,
    toggle() { on = !on && list.length > 1; if (!on) show(list.length - 1); return on; },
    stop() { if (timer) clearInterval(timer); timer = null; on = false; layers.forEach(l => { try { lmap.removeLayer(l); } catch (e) {} }); }
  };
}
function wxrTimeText(t, tz) { return t == null ? "Latest radar" : clock(new Date(t), tz); }

// ---- Weather screen card (js/75 adds it below Go or stay home) ----
// Small map around the place (no dragging), the loop, ⏸/▶, "Open on the map". Outside the US: nothing (the alerts box says so).
function wxrSection(w, p) {
  const r = wxrRegion(p.lat, p.lng);
  if (!r || !window.L) return null;
  const box = el("div", "wx-sec wxr-card"); box.id = "wxr-card";
  const head = el("div", "wxr-head");
  head.append(el("div", "hn-lab", "RAIN RADAR · LAST HOUR"));
  const tl = el("span", "wxr-time"); tl.id = "wxr-time"; tl.textContent = "Loading…";
  head.append(tl);
  box.appendChild(head);
  const mapDiv = el("div", "wxr-map"); mapDiv.id = "wxr-map"; mapDiv.setAttribute("role", "img"); mapDiv.setAttribute("aria-label", "Rain radar around " + (p.name || "this place"));
  box.appendChild(mapDiv);
  const row = el("div", "wxr-row");
  const play = el("button", "btn ghost small", "⏸ Pause"); play.type = "button"; play.id = "wxr-play"; play.hidden = true;
  const open = el("button", "btn ghost small", "🗺 Open on the map"); open.type = "button"; open.id = "wxr-open";
  open.addEventListener("click", () => wxrOpenOnMap(p.lat, p.lng));
  row.append(play, el("span", "wxr-key", "light"), el("span", "wxr-bar"), el("span", "wxr-key", "heavy"), open);
  box.appendChild(row);
  box.appendChild(el("div", "spot-meta", "Radar: NOAA / National Weather Service. Shows rain and storms in the last hour, not what's coming."));
  let mini = null, loop = null;
  const start = () => {
    if (!box.isConnected || mini) return;
    mini = L.map(mapDiv, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, boxZoom: false, keyboard: false, tap: false })
      .setView([p.lat, p.lng], 7);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(mini);
    L.circleMarker([p.lat, p.lng], { radius: 5, color: "#fff", weight: 2, fillColor: "#1d6fd6", fillOpacity: 1, interactive: false }).addTo(mini);
    wxrFrames(r).then(frames => {
      if (!box.isConnected) return;
      loop = wxrLoop(mini, r, frames, { label: (t, i, n) => { tl.textContent = wxrTimeText(t, p.tz) + (n > 1 && i === n - 1 ? " (newest)" : ""); },
        visible: () => box.isConnected && !$("view-wx").hidden });
      play.hidden = loop.frames.length < 2;
      // stop when the card is gone (the screen re-draws on a new place or ↻)
      const watch = setInterval(() => { if (!box.isConnected) { clearInterval(watch); loop.stop(); try { mini.remove(); } catch (e) {} } }, 2000);
    });
  };
  play.addEventListener("click", () => { if (!loop) return; const on = loop.toggle(); play.textContent = on ? "⏸ Pause" : "▶ Play"; });
  setTimeout(start, 0);
  return box;
}
function wxrOpenOnMap(lat, lng) {
  showView("map"); initMap(); if (!map) return;
  map.setView([lat, lng], 8);
  wxrMapSet(true);
}

// ---- Map layer: 🌧 Rain radar (Layers sheet → On the water) ----
const wxrMap = { on: false, loop: null, region: null, seq: 0, bound: false, refresh: null };
function wxrMapNote(text) { const t = $("radar-time"); if (t) t.textContent = text; }
async function wxrMapLoad() {
  if (!wxrMap.on || !map) return;
  const seq = ++wxrMap.seq, c = map.getCenter(), r = wxrRegion(c.lat, c.lng);
  if (wxrMap.loop) { wxrMap.loop.stop(); wxrMap.loop = null; }
  wxrMap.region = r ? r.id : null;
  const play = $("radar-play");
  if (!r) { if (play) play.hidden = true; wxrMapNote("Rain radar covers the US only — move the map over the US."); return; }
  wxrMapNote("Loading radar…");
  const frames = await wxrFrames(r);
  if (seq !== wxrMap.seq || !wxrMap.on) return;
  wxrMap.loop = wxrLoop(map, r, frames, { label: (t, i, n) => wxrMapNote("🌧 " + wxrTimeText(t) + (n > 1 && i === n - 1 ? " (newest)" : "")),
    visible: () => !$("view-map").hidden });
  if (play) { play.hidden = wxrMap.loop.frames.length < 2; play.textContent = "⏸"; play.setAttribute("aria-label", "Pause the radar loop"); }
}
function wxrMapSet(on) {
  wxrMap.on = on;
  const btn = $("mx-radar"); if (btn) { btn.classList.toggle("on", on); btn.setAttribute("aria-pressed", String(on)); }
  const bar = $("radar-bar"); if (bar) bar.hidden = !on;
  if (!on) { wxrMap.seq++; if (wxrMap.loop) wxrMap.loop.stop(); wxrMap.loop = null; clearInterval(wxrMap.refresh); wxrMap.refresh = null; return; }
  initMap(); if (!map) return;
  if (!wxrMap.bound) {
    wxrMap.bound = true;
    map.on("moveend", () => { if (!wxrMap.on) return; const c = map.getCenter(), r = wxrRegion(c.lat, c.lng); if ((r ? r.id : null) !== wxrMap.region) wxrMapLoad(); });
  }
  clearInterval(wxrMap.refresh);
  wxrMap.refresh = setInterval(() => { if (wxrMap.on && !$("view-map").hidden) wxrMapLoad(); }, 5 * 60000);   // new pictures every 5 minutes while on
  wxrMapLoad();
}
// The Layers switch is hidden when your area is outside the US (radar there would be empty)
function wxrRowSync() {
  const row = document.querySelector('#layers-body .lyr[data-for="mx-radar"]'); if (!row) return;
  const out = !wxrRegion(LAT, LNG);
  row.hidden = out && !wxrMap.on;
}
(function wxrSetup() {
  const b = $("mx-radar"); if (b) b.addEventListener("click", () => wxrMapSet(!wxrMap.on));
  const p = $("radar-play");
  if (p) p.addEventListener("click", () => {
    if (!wxrMap.loop) return;
    const on = wxrMap.loop.toggle();
    p.textContent = on ? "⏸" : "▶"; p.setAttribute("aria-label", on ? "Pause the radar loop" : "Play the radar loop");
  });
  const lb = $("map-layers-btn"); if (lb) lb.addEventListener("click", wxrRowSync);
  wxrRowSync();
})();
