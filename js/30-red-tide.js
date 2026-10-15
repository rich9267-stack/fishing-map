  // ---- 🔴 Red tide (Gulf expansion step 5): FWC's water samples as a map layer, a heads-up banner and a Boat mode line ----
  // Data: FWC-FWRI "Karenia brevis cells per liter" — one dot per water sample from the last 8 days, refreshed daily (about 4:45 PM Eastern).
  // Free, no key, asked straight from the phone (same server as the FWC reefs / ramps / depth lines). The phone alert is the edge function
  // `red-tide-watch` (setup/62). rtLevel / rtDate / rtSummary below are kept identical to supabase/functions/red-tide-watch/core.mjs (test118 checks it).
  //  - Banner (Home / Map / Boat mode): the worst MEDIUM or HIGH sample within 15 miles of the area you are in, with its age. Tap for details.
  //  - Map layer: 🔴 Red tide — every sample in view, coloured by level; tap a dot for its details.
  //  - A sample is one spot on one day. "Not present" next to you does not prove the water is clear; the banner and notes say so.
  const RT = {
    url: "https://gis.myfwc.com/mapping/rest/services/Projects_FWC/HAB_forDEP_Dashboard/MapServer/0/query",
    fields: "HAB_ID,SampleDate_t,LOCATION,LATITUDE,LONGITUDE,SAMPLE_DEPTH,Abundance",
    maxAgeDays: 8, nearMi: 15, alertLevel: 3, minZoom: 7,
    fwcMap: "https://gis.myfwc.com/redtidecurrentstatus/"
  };
  const RT_LEVELS = ["Not present", "Very low", "Low", "Medium", "High"];
  const RT_RANGES = ["0–1,000", "1,000–10,000", "10,000–100,000", "100,000–1,000,000", "over 1,000,000"];
  const RT_COLORS = ["#9aa5b1", "#f4d03f", "#f39c12", "#e55d2b", "#b3261e"];
  const RT_HIDE_KEY = "fm-rt-hide";
  const rt = { cache: {}, summary: null, point: null, open: false, on: false, layer: null, seq: 0, bound: false, timer: null };

  function rtLevel(a) {
    const s = String(a == null ? "" : a).toLowerCase();
    if (/not present|background/.test(s)) return 0;
    if (/very low/.test(s)) return 1;
    if (/\blow\b/.test(s)) return 2;
    if (/medium/.test(s)) return 3;
    if (/\bhigh\b/.test(s)) return 4;
    return -1;
  }
  function rtDate(t) {
    const s = String(t == null ? "" : t).trim();
    if (!s) return null;
    let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
    if (m) return new Date(+m[3], +m[1] - 1, +m[2], 12).getTime();
    m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], 12).getTime();
    const p = Date.parse(s);
    return isFinite(p) ? p + 12 * 3600000 : null;
  }
  function rtMiles(a, b, c, d) {
    const R = 3958.8, r = Math.PI / 180, dl = (c - a) * r, dg = (d - b) * r;
    const h = Math.sin(dl / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dg / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function rtSummary(samples, lat, lng, now, radiusMi = RT.nearMi, maxAgeDays = RT.maxAgeDays) {
    const near = [];
    for (const s of samples) {
      if (s.level < 0 || !isFinite(s.lat) || !isFinite(s.lng)) continue;
      if (s.ms != null && now - s.ms > maxAgeDays * 86400000) continue;
      const mi = rtMiles(lat, lng, s.lat, s.lng);
      if (mi <= radiusMi) near.push({ ...s, mi });
    }
    if (!near.length) return null;
    const level = Math.max(...near.map(s => s.level));
    const worst = near.filter(s => s.level === level).sort((a, b) => a.mi - b.mi)[0];
    const counts = [0, 0, 0, 0, 0];
    near.forEach(s => counts[s.level]++);
    return { level, mi: worst.mi, ms: worst.ms, place: worst.place || "", n: near.length, counts, rawDate: worst.rawDate || "" };
  }
  const rtWhen = ms => {
    if (ms == null) return "recently";
    const d = Math.round((Date.now() - ms) / 86400000);
    return d <= 0 ? "today" : d === 1 ? "yesterday" : d + " days ago";
  };
  const rtDay = () => new Date().toLocaleDateString("en-CA");   // your own calendar day, so "Hide for today" ends at midnight where you are

  // ---- asking FWC ----
  function rtSample(a) {
    const lat = +a.LATITUDE, lng = +a.LONGITUDE;
    if (!isFinite(lat) || !isFinite(lng)) return null;
    return { lat, lng, level: rtLevel(a.Abundance), ms: rtDate(a.SampleDate_t), place: String(a.LOCATION || "").replace(/\s+/g, " ").trim(),
      depth: a.SAMPLE_DEPTH, rawDate: String(a.SampleDate_t || "").replace(/\s+/g, " ").trim(), id: a.HAB_ID };
  }
  async function rtFetchBox(w, s, e, n) {
    const box = [w, s, e, n].map(v => (+v).toFixed(4)).join(",");
    const r = await fetch(`${RT.url}?where=1%3D1&geometry=${box}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects` +
      `&outFields=${RT.fields}&returnGeometry=false&resultRecordCount=2000&f=json`);
    if (!r.ok) throw new Error("FWC answered " + r.status);
    const d = await r.json();
    if (d.error || !Array.isArray(d.features)) throw new Error("FWC sent something unexpected");
    return { list: d.features.map(f => rtSample(f.attributes || {})).filter(Boolean), more: !!d.exceededTransferLimit };
  }

  // ---- the banner (Home, Map, Boat mode) ----
  function rtPoint() {
    if ($("boat") && !$("boat").hidden && typeof boat !== "undefined" && boat.pos) return { lat: boat.pos.lat, lng: boat.pos.lng };
    return { lat: LAT, lng: LNG };
  }
  async function rtRefresh(force) {
    if (!me) return;
    const pt = rtPoint(), key = pt.lat.toFixed(1) + "," + pt.lng.toFixed(1), c = rt.cache[key];
    let list = null;
    if (c && !force && Date.now() - c.t < (c.failed ? 5 : 20) * 60000) list = c.list;   // remembered 20 minutes; after a failure, 5 minutes before trying FWC again
    else {
      try {
        const dlat = 0.25, dlng = 0.25 / Math.max(0.2, Math.cos(pt.lat * Math.PI / 180));
        list = (await rtFetchBox(pt.lng - dlng, pt.lat - dlat, pt.lng + dlng, pt.lat + dlat)).list;
        rt.cache[key] = { t: Date.now(), list };
      } catch (e) { list = c ? c.list : null; rt.cache[key] = { t: Date.now(), list, failed: true }; }   // FWC down: keep what we had, say nothing
    }
    rt.point = pt;
    rt.summary = list ? rtSummary(list, pt.lat, pt.lng, Date.now()) : null;
    rtRender();
  }
  function rtHidden(s) {
    try { const h = JSON.parse(localStorage.getItem(RT_HIDE_KEY) || "null"); return !!h && h.day === rtDay() && h.level >= s.level; } catch (e) { return false; }
  }
  function rtRender() {
    const box = $("rt-banner"); if (!box) return;
    const s = rt.summary, show = !!(s && s.level >= RT.alertLevel && !rtHidden(s));
    box.innerHTML = "";
    if (show) {
      const mi = Math.max(1, Math.round(s.mi)), hot = s.level >= 4;
      const d = el("div", "wx-item rt-item" + (hot ? " urgent" : ""));
      d.setAttribute("role", "button"); d.tabIndex = 0; d.setAttribute("aria-expanded", String(rt.open));
      d.appendChild(el("b", null, (hot ? "🔴 " : "🟠 ") + RT_LEVELS[s.level] + " red tide reported nearby"));
      d.appendChild(el("span", null, ` — about ${mi} mi away · ${rtWhen(s.ms)}`));
      if (rt.open) {
        const more = el("div", "wx-more");
        more.appendChild(el("div", null, `Worst sample: ${RT_LEVELS[s.level]} (${RT_RANGES[s.level]} cells per litre)${s.place ? " at " + s.place : ""}${s.rawDate ? ", sampled " + s.rawDate : ""}.`));
        more.appendChild(el("div", null, `${s.n} sample${s.n === 1 ? "" : "s"} within ${RT.nearMi} miles in the last ${RT.maxAgeDays} days.`));
        more.appendChild(el("div", null, "Red tide can discolour the water, kill fish, and irritate eyes and throats (more so with asthma or other breathing trouble). Fish may leave or stop biting. One sample is one spot on one day, and wind and tide can move a bloom fast — check FWC's map before you go."));
        const row = el("div", "ci-btns");
        row.appendChild(frBtn("🗺 Show on the map", e => { e.stopPropagation(); rtShowOnMap(); }, "btn small"));
        const a = el("a", "btn ghost small", "FWC's red tide map ↗"); a.href = RT.fwcMap; a.target = "_blank"; a.rel = "noopener"; a.addEventListener("click", e => e.stopPropagation());
        row.appendChild(a);
        row.appendChild(frBtn("Hide for today", e => { e.stopPropagation(); try { localStorage.setItem(RT_HIDE_KEY, JSON.stringify({ day: rtDay(), level: s.level })); } catch (err) {} rt.open = false; rtRender(); }));
        more.appendChild(row);
        more.appendChild(el("div", "spot-meta", "Source: FWC-FWRI (Florida Fish and Wildlife Research Institute), samples from the last 8 days, updated daily."));
        d.appendChild(more);
      }
      const toggle = () => { rt.open = !rt.open; rtRender(); };
      d.addEventListener("click", toggle);
      d.addEventListener("keydown", e => { if (e.target === d && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); toggle(); } });
      box.appendChild(d);
    }
    box.hidden = !show;
    const bl = $("boat-rt");
    if (bl) {
      bl.hidden = !show; bl.className = show && s.level >= 4 ? "urgent" : "";
      if (show) bl.textContent = (s.level >= 4 ? "🔴 " : "🟠 ") + RT_LEVELS[s.level] + " red tide ~" + Math.max(1, Math.round(s.mi)) + " mi away (" + rtWhen(s.ms) + ")";
    }
  }

  // ---- the map layer ----
  function rtNote(text) {
    const n = $("rt-note"); if (!n) return;
    n.hidden = !rt.on || !text; n.textContent = rt.on ? text || "" : "";
    const k = $("rt-key"); if (k) k.hidden = !rt.on;
  }
  const RT_KEY_NOTE = "🔴 Red tide samples from the last 8 days (FWC-FWRI). Dot colour = red tide cells per litre: grey none · yellow very low · orange low · red-orange medium · dark red high. One dot is one sample — a grey dot doesn't prove the whole area is clear.";
  function rtPopup(s, ll) {
    const lv = s.level, box = mxPopup("🔴 Red tide sample: " + (lv >= 0 ? RT_LEVELS[lv] : "unknown level"), [
      ["Cells per litre", lv >= 0 ? RT_RANGES[lv] : null], ["Sampled", s.rawDate ? s.rawDate + (s.ms != null ? " (" + rtWhen(s.ms) + ")" : "") : null],
      ["Where", s.place], ["Depth", s.depth != null && s.depth !== "" && isFinite(+s.depth) ? (+s.depth).toFixed(1) + " m" : null]], ll);
    box.appendChild(el("div", "pop-meta", "Source: FWC-FWRI"));
    return box;
  }
  async function rtLoadLayer() {
    if (!rt.on || !map) return;
    const seq = ++rt.seq;
    if (rt.layer) { map.removeLayer(rt.layer); rt.layer = null; }
    if (map.getZoom() < RT.minZoom) { rtNote("Zoom in a little to see red tide samples."); return; }
    rtNote("Loading red tide samples…");
    try {
      const b = map.getBounds(), r = await rtFetchBox(b.getWest(), b.getSouth(), b.getEast(), b.getNorth());
      if (seq !== rt.seq || !rt.on) return;
      const g = L.layerGroup();
      r.list.filter(s => s.level >= 0).sort((a, b) => a.level - b.level).forEach(s => {   // worst on top
        const ll = [s.lat, s.lng];
        const m = L.circleMarker(ll, { radius: 5 + s.level, color: "#fff", weight: 1.5, fillColor: RT_COLORS[s.level], fillOpacity: 0.95,
          a11y: `Red tide sample, ${RT_LEVELS[s.level]}, ${s.ms != null ? rtWhen(s.ms) : "recent"}` });
        m.bindPopup(() => rtPopup(s, ll));
        m.addTo(g);
      });
      g.addTo(map); rt.layer = g;
      const shown = r.list.filter(s => s.level >= 0).length;
      rtNote(shown ? RT_KEY_NOTE + (r.more ? " Many samples here — zoom in to see them all." : "") : "No red tide samples in this view in the last 8 days (FWC doesn't sample everywhere every day). " + "Source: FWC-FWRI.");
    } catch (e) {
      if (seq === rt.seq) rtNote("Couldn't load red tide samples right now (FWC's map service may be down) — try again later.");
    }
  }
  function setRtOn(on) {
    rt.on = on;
    const btn = $("mx-redtide"); if (btn) { btn.classList.toggle("on", on); btn.setAttribute("aria-pressed", String(on)); }
    if (!on) { rt.seq++; if (map && rt.layer) map.removeLayer(rt.layer); rt.layer = null; rtNote(""); return; }
    initMap(); if (!map) return;
    if (!rt.bound) { rt.bound = true; map.on("moveend", () => { if (!rt.on) return; clearTimeout(rt.timer); rt.timer = setTimeout(rtLoadLayer, 400); }); }
    rtLoadLayer();
  }
  // "Show on the map" (banner button, and the phone alert's link): map on, red tide layer on, centred where the sample is
  function rtShowOnMap() {
    showView("map"); initMap(); if (!map) return;
    const p = rt.point || rtPoint();
    map.setView([p.lat, p.lng], 10);
    setRtOn(true);
  }
  (function rtSetup() { const b = $("mx-redtide"); if (b) b.addEventListener("click", () => setRtOn(!rt.on)); })();
