  // ---- 🚫 No-fishing zones check (Gulf expansion step 8): is this spot / where I am standing inside a closed area? ----
  // Data: table `protected_zones` (setup/65) = the Florida "No Take" and "No Access" areas of the national Marine Protected Areas inventory
  // (NOAA / NMPAS): Florida Keys sanctuary preservation areas, ecological reserves and research-only areas, the Tortugas reserves, Dry Tortugas
  // Research Natural Area, wildlife refuges closed to the public, manatee no-entry zones. About 40 shapes, so the phone keeps the whole list
  // for a week (works offline on the boat). Levels: 'no_fishing' (fishing prohibited) · 'no_entry' (closed to the public).
  // HONEST LIMITS: this is a heads-up, not legal advice. "Nothing found" never means "allowed": state parks, other refuges, aquatic preserves,
  // seasonal closures and local rules are NOT in this list (the map's dashed 🚫 layer shows those as "rules apply").
  const ZN = { key: "fm-zones-v1", age: 7 * 86400000, nearMi: 0.5 };
  const zn = { rows: [], t: 0, read: false, loading: null, layer: null, open: {} };

  // ---- shape tests (flat maths is plenty at this size) ----
  function znRingHas(ring, lng, lat) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if ((yi > lat) !== (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function znPolyHas(poly, lng, lat) {   // first ring = outside edge, the others are holes
    if (!poly || !poly.length || !znRingHas(poly[0], lng, lat)) return false;
    for (let k = 1; k < poly.length; k++) if (znRingHas(poly[k], lng, lat)) return false;
    return true;
  }
  function znGeomHas(g, lng, lat) {
    if (!g) return false;
    if (g.type === "Polygon") return znPolyHas(g.coordinates, lng, lat);
    if (g.type === "MultiPolygon") return g.coordinates.some(p => znPolyHas(p, lng, lat));
    return false;
  }
  function znSegMi(lat, lng, a, b) {   // miles from a point to the line piece a→b (each [lng, lat])
    const ky = 69.09, kx = 69.17 * Math.cos(lat * Math.PI / 180);
    const px = (lng - a[0]) * kx, py = (lat - a[1]) * ky, dx = (b[0] - a[0]) * kx, dy = (b[1] - a[1]) * ky;
    const len2 = dx * dx + dy * dy, t = len2 ? Math.max(0, Math.min(1, (px * dx + py * dy) / len2)) : 0;
    return Math.hypot(px - t * dx, py - t * dy);
  }
  function znEdgeMi(g, lat, lng) {   // distance to the nearest edge of a Polygon / MultiPolygon
    const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
    let best = Infinity;
    polys.forEach(poly => poly.forEach(ring => { for (let i = 1; i < ring.length; i++) best = Math.min(best, znSegMi(lat, lng, ring[i - 1], ring[i])); }));
    return best;
  }
  const znSize = r => (r.max_lat - r.min_lat) * (r.max_lng - r.min_lng);

  // zoneAt: { inside: row | null, near: { row, mi } | null }. When shapes overlap, the smallest (most specific) one wins.
  function zoneAt(lat, lng, nearMi, rows) {
    rows = rows || zn.rows;
    const lim = nearMi == null ? ZN.nearMi : nearMi;
    if (!isFinite(lat) || !isFinite(lng)) return { inside: null, near: null };
    const padLat = lim / 69, padLng = lim / (69.17 * Math.max(0.2, Math.cos(lat * Math.PI / 180)));
    let inside = null, near = null;
    for (const r of rows) {
      if (lat < r.min_lat - padLat || lat > r.max_lat + padLat || lng < r.min_lng - padLng || lng > r.max_lng + padLng) continue;
      if (znGeomHas(r.geom, lng, lat)) { if (!inside || znSize(r) < znSize(inside)) inside = r; continue; }
      const mi = znEdgeMi(r.geom, lat, lng);
      if (mi <= lim && (!near || mi < near.mi)) near = { row: r, mi };
    }
    return { inside, near: inside ? null : near };
  }

  // ---- words ----
  const znWhat = r => r.level === "no_entry" ? "closed to the public" : "fishing is not allowed";
  function znLine(hit) {
    if (hit.inside) return "🚫 " + hit.inside.name + " — " + znWhat(hit.inside);
    if (hit.near) return "⚠️ " + (typeof fmtDist === "function" ? fmtDist(hit.near.mi) : hit.near.mi.toFixed(1) + " mi") + " from " + hit.near.row.name + " (" + znWhat(hit.near.row) + ")";
    return "";
  }
  function znDetails(r) {
    const box = el("div", "zone-more");
    box.appendChild(el("div", null, r.name));
    box.appendChild(el("div", null, r.level === "no_entry" ? "Closed to the public (no entry)." : "No fishing: commercial and recreational fishing are prohibited."));
    if (r.protection) box.appendChild(el("div", "spot-meta", "Protection level: " + r.protection));
    if (r.agency) box.appendChild(el("div", "spot-meta", "Managed by: " + r.agency));
    if (r.anchor && r.anchor !== "Unrestricted") box.appendChild(el("div", "spot-meta", "Anchoring: " + r.anchor));
    if (r.vessel && r.vessel !== "Unrestricted") box.appendChild(el("div", "spot-meta", "Boats: " + r.vessel));
    if (r.url && /^https?:\/\//.test(r.url)) { const a = el("a", "spot-meta", "More about this area ↗"); a.href = r.url; a.target = "_blank"; a.rel = "noopener"; box.appendChild(a); }
    box.appendChild(el("div", "spot-meta", "Source: NOAA's national Marine Protected Areas inventory. A guide only — check FWC / NOAA rules before you fish. Areas not on this list can still have rules."));
    return box;
  }

  // ---- the list: this phone's copy, refreshed from the database about once a week ----
  function znCacheRead() {
    zn.read = true;
    try { const j = JSON.parse(localStorage.getItem(ZN.key) || "null"); if (j && Array.isArray(j.rows)) { zn.rows = j.rows; zn.t = j.t || 0; } } catch (e) { /* no copy yet */ }
  }
  function zonesEnsure() {
    if (!zn.read) znCacheRead();
    if (!me || zn.loading) return zn.loading;
    if (zn.rows.length && Date.now() - zn.t < ZN.age) return null;
    if (zn.failAt && Date.now() - zn.failAt < 300000) return null;   // asked and failed (offline?): wait 5 minutes before asking again
    zn.loading = (async () => {
      try {
        const { data, error } = await db.from("protected_zones").select("id,name,level,rule,protection,agency,url,anchor,vessel,geom,min_lat,min_lng,max_lat,max_lng").limit(500);
        if (error) throw error;
        const changed = !zn.rows.length || (data || []).length !== zn.rows.length;
        zn.rows = data || []; zn.t = Date.now();
        try { localStorage.setItem(ZN.key, JSON.stringify({ t: zn.t, rows: zn.rows })); } catch (e) { /* storage full: asked again next time */ }
        if (changed) znChanged();
        zn.failAt = 0;
      } catch (e) { zn.failAt = Date.now(); /* offline: the copy on this phone (if any) keeps working */ }
      finally { zn.loading = null; }
    })();
    return zn.loading;
  }
  function znChanged() {
    if (typeof renderSpots === "function" && typeof spots !== "undefined" && spots && spots.length && $("spot-list")) renderSpots();
    znBoatRender(); znQcRender();
    if (typeof mxOn !== "undefined" && mxOn.zone) znDraw();
  }

  // ---- spot cards ----
  // A chip on each spot that is inside (or within half a mile of) a closed area. Tap it for the details. Blurred pins are skipped (not exact).
  function zoneChip(s) {
    if (!s || s.lat == null || s.lng == null || s.is_exact === false) return null;
    zonesEnsure();
    const hit = zoneAt(+s.lat, +s.lng);
    if (!hit.inside && !hit.near) return null;
    const row = hit.inside || hit.near.row, key = s.id + ":" + row.id;
    const wrap = el("span", "zone-chip-wrap");
    const b = el("button", "chip zone-chip" + (hit.inside ? " in" : ""), znLine(hit)); b.type = "button";
    b.setAttribute("aria-expanded", String(!!zn.open[key]));
    const more = znDetails(row); more.hidden = !zn.open[key];
    b.addEventListener("click", () => { zn.open[key] = !zn.open[key]; more.hidden = !zn.open[key]; b.setAttribute("aria-expanded", String(!!zn.open[key])); });
    wrap.appendChild(b); wrap.appendChild(more);
    return wrap;
  }

  // ---- Boat mode: a line that turns red while you are inside ----
  function znBoatRender() {
    const box = $("boat-zone"); if (!box) return;
    zonesEnsure();
    const fresh = typeof boat !== "undefined" && boat.pos && Date.now() - boat.pos.t < 30000;
    const hit = fresh ? zoneAt(boat.pos.lat, boat.pos.lng) : { inside: null, near: null };
    const text = znLine(hit);
    box.hidden = !text; box.textContent = text; box.className = hit.inside ? "urgent" : "";
  }

  // ---- Quick catch: same warning under "At <spot>" ----
  function znQcRender() {
    const box = $("qc-zone"); if (!box) return;
    zonesEnsure();
    const p = typeof qc !== "undefined" && qc.pos ? qc.pos : null;
    const hit = p ? zoneAt(p.lat, p.lng) : { inside: null, near: null };
    const text = znLine(hit);
    box.hidden = !text; box.textContent = text; box.className = "zone-warn" + (hit.inside ? " in" : "");
  }

  // ---- map: the closed areas in solid colour on top of the dashed "rules apply" outlines (also when the state's server is down) ----
  function znDraw() {
    if (typeof map === "undefined" || !map) return;
    if (zn.layer) { map.removeLayer(zn.layer); zn.layer = null; }
    if (typeof mxOn === "undefined" || !mxOn.zone || !zn.rows.length) return;
    if (!zn.read) znCacheRead();
    const g = L.layerGroup();
    zn.rows.forEach(r => {
      const red = r.level === "no_fishing", col = red ? "#b3261e" : "#d35400";
      const l = L.geoJSON({ type: "Feature", properties: {}, geometry: r.geom }, { style: { color: col, weight: 2, fillColor: col, fillOpacity: red ? 0.3 : 0.22 } });
      l.eachLayer(x => { x.options.a11y = (red ? "No-fishing zone: " : "Closed area: ") + r.name; x.bindPopup(() => znDetails(r)); });
      l.addTo(g);
    });
    g.addTo(map); zn.layer = g;
  }
  function znUndraw() { if (zn.layer && typeof map !== "undefined" && map) map.removeLayer(zn.layer); zn.layer = null; }
