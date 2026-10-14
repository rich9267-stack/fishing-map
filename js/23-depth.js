  // ---- 〰 Depth lines (Fishbrain audit item 12): free FWC depth contours, salt and fresh water in one button ----
  // Ocean / coast: FWC "Bathymetric Contours Southeast US" (3, 6, 13, 20, 33, 66, 98 ft … offshore). Lakes: FWC "Bathymetry of
  // Select Lakes in Florida" (1-foot lines, surveyed lakes from Palm Beach County north — none in Broward / Miami-Dade or canals).
  // Both are drawn as see-through pictures by FWC's map server, one picture per map square (same trick as the NOAA chart).
  // With the layer on, tapping the map (when you're not placing a spot) asks for the nearest line and says its depth.
  const DEP = {
    coast: { url: "https://gis.myfwc.com/hosting/rest/services/Projects_FWC/Bathymetric_Contours_Southeast_US/MapServer", layer: 0, field: "DEPTH_FT", minZoom: 7 },
    lake: { url: "https://gis.myfwc.com/hosting/rest/services/Open_Data/Bathymetry_of_Select_Lakes_in_Florida/MapServer", layer: 3, field: "DEPTHF", minZoom: 13 }
  };
  let depOn = false, depLayers = { coast: null, lake: null }, depMsg = "", depBad = 0, depOk = 0, depSeq = 0;

  function depTileLayer(def, opts) {
    const T = L.TileLayer.extend({
      getTileUrl(c) {
        const size = 256, R = 6378137, world = 2 * Math.PI * R, res = world / (size * Math.pow(2, c.z));
        const x0 = -world / 2 + c.x * size * res, y1 = world / 2 - c.y * size * res;
        const bbox = [x0, y1 - size * res, x0 + size * res, y1].join(",");
        return `${def.url}/export?bbox=${bbox}&bboxSR=3857&imageSR=3857&size=${size},${size}&layers=show:${def.layer}&format=png32&transparent=true&f=image`;
      }
    });
    const layer = new T("", Object.assign({ maxZoom: 19, minZoom: def.minZoom, opacity: 0.9, attribution: "Depth lines &copy; FWC" }, opts));
    layer.on("tileload", () => { depOk++; if (depMsg === DEP_DOWN) { depMsg = ""; depNote(); } });
    layer.on("tileerror", () => { depBad++; if (!depOk && depBad >= 3) { depMsg = DEP_DOWN; depNote(); } });
    return layer;
  }
  const DEP_DOWN = "FWC's depth service isn't answering right now — try again later.";

  function depNote() {
    const n = $("dep-note"); if (!n) return;
    n.hidden = !depOn;
    if (!depOn) { n.textContent = ""; return; }
    const z = map ? map.getZoom() : 0, parts = [];
    if (depMsg) parts.push(depMsg);
    if (z < DEP.coast.minZoom) parts.push("Zoom in to see depth lines.");
    else if (z < DEP.lake.minZoom) parts.push("〰 Ocean depth lines on (3, 6, 13, 20, 33, 66, 98 ft…). Zoom in on a lake to see its 1-ft lines, where FWC has surveyed it.");
    else parts.push("〰 Depth lines on. Tap near a line to read its depth. Lakes: only ones FWC surveyed (Palm Beach County north — none in Broward or the canals).");
    parts.push("Depth lines: FWC — a guide only, not for navigation.");
    n.textContent = parts.join(" ");
  }

  // tap near a line → "≈ 13 ft". Asks both services for lines inside a small box (about 12 screen dots) around the tap.
  async function depTap(ll) {
    if (!depOn || !map || (typeof placing !== "undefined" && placing)) return;
    const seq = ++depSeq, z = map.getZoom();
    const p = map.latLngToContainerPoint(ll), a = map.containerPointToLatLng([p.x - 12, p.y + 12]), b = map.containerPointToLatLng([p.x + 12, p.y - 12]);
    const box = [a.lng, a.lat, b.lng, b.lat].map(v => v.toFixed(6)).join(",");
    const ask = async (def) => {
      if (z < def.minZoom) return [];
      try {
        const r = await fetch(`${def.url}/${def.layer}/query?geometry=${box}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=${def.field}&returnGeometry=false&resultRecordCount=20&f=json`);
        if (!r.ok) return null;
        const d = await r.json();
        if (d.error || !Array.isArray(d.features)) return null;
        return d.features.map(f => Math.abs(Number((f.attributes || {})[def.field]))).filter(v => isFinite(v) && v > 0);
      } catch (e) { return null; }
    };
    const [lake, coast] = await Promise.all([ask(DEP.lake), ask(DEP.coast)]);
    if (seq !== depSeq || !depOn) return;
    const fmt = v => (v >= 10 ? Math.round(v) : +v.toFixed(1)) + " ft";
    let text;
    if (lake && lake.length) { const s = [...new Set(lake)].sort((x, y) => x - y); text = `〰 Lake depth line: ≈ ${s.length > 1 ? fmt(s[0]) + " – " + fmt(s[s.length - 1]) : fmt(s[0])}`; }
    else if (coast && coast.length) { const s = [...new Set(coast)].sort((x, y) => x - y); text = `〰 Depth line: ≈ ${s.length > 1 ? fmt(s[0]) + " – " + fmt(s[s.length - 1]) : fmt(s[0])}`; }
    else if (lake === null || coast === null) text = "Couldn't read the depth right now — try again.";
    else return;   // no line near the tap: say nothing
    L.popup({ autoPan: false }).setLatLng(ll).setContent(`<div class="pop-name">${text}</div><div class="pop-meta">FWC depth lines · a guide only, not for navigation</div>`).openOn(map);
  }

  function setDepOn(on) {
    depOn = on;
    const btn = $("mx-depth"); if (btn) { btn.classList.toggle("on", on); btn.setAttribute("aria-pressed", String(on)); }
    if (!on) { depSeq++; ["coast", "lake"].forEach(k => { if (map && depLayers[k]) map.removeLayer(depLayers[k]); }); depNote(); return; }
    initMap(); if (!map) return;
    depLayers.coast = depLayers.coast || depTileLayer(DEP.coast, { opacity: 0.8 });
    depLayers.lake = depLayers.lake || depTileLayer(DEP.lake, { opacity: 0.95 });
    depLayers.coast.addTo(map); depLayers.lake.addTo(map);
    if (!map._depBound) { map._depBound = true; map.on("zoomend", depNote); map.on("click", e => depTap(e.latlng)); }
    depMsg = ""; depBad = 0; depOk = 0;
    depNote();
  }
  (function depSetup() { const b = $("mx-depth"); if (b) b.addEventListener("click", () => setDepOn(!depOn)); })();
