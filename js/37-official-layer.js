  // ---- ✅ Official public spots map layer (step 1: the switch + the pins) ----
  // One switch in Map › Layers (first in the Fishing group) that draws the official places on the map: boat ramps, piers / jetties / bridges,
  // park bank-fishing, and places an admin made official (⭐). The data is the same `officialSpots` list that Find new water and Quick catch use
  // (js/02): the app loads it one 0.5° square ("cell") at a time and keeps at most OFFICIAL_MAX_CELLS squares on the phone, so this layer only
  // asks for the squares nearest the middle of the map and draws what falls inside the view. Pins show from zoom 9; further out you get a plain line.
  // Not built yet (later steps): the tap card, the filter buttons, "More from FWC", Directions / Save / Start a trip, retiring the old ⛵ Boat ramps layer.
  const OL = { minZoom: 9, max: 400, on: false, group: null, seq: 0, timer: null };
  const olKind = o => (o.kind === "ramp" ? "ramp" : (o.kind === "pier" || o.kind === "jetty" || o.kind === "bridge") ? "pier" : "park");
  const OL_SYMBOL = { ramp: "⛵", pier: "🎣", park: "🌳" };

  function olIcon(o) {
    const k = olKind(o);
    return L.divIcon({ className: "ol-icon", iconSize: [28, 28], iconAnchor: [14, 14],
      html: `<span class="ol-pin ol-${k}" aria-hidden="true">${OL_SYMBOL[k]}${o.source === "admin" ? '<span class="ol-star">⭐</span>' : ""}</span>` });
  }
  function olSay(text) { mxMsg.official = text; mxNote(); }   // the plain line under the map buttons (same place the other layers talk)
  function olClear() { if (OL.group) { map.removeLayer(OL.group); OL.group = null; } }

  function olDraw(skippedCells) {
    if (!map || !OL.on) return;
    olClear();
    const box = map.getBounds().pad(0.1), c = map.getCenter();
    let list = (officialSpots || []).filter(o => o.lat != null && o.lng != null && box.contains([o.lat, o.lng]));
    let capped = false;
    if (list.length > OL.max) {   // a very busy view: keep the ones nearest the middle
      capped = true;
      const dist = o => (o.lat - c.lat) * (o.lat - c.lat) + (o.lng - c.lng) * (o.lng - c.lng);
      list = list.sort((a, b) => dist(a) - dist(b)).slice(0, OL.max);
    }
    const g = L.layerGroup();
    list.forEach(o => {
      const label = (OFFICIAL_LABEL[o.kind] || "Fishing spot");
      L.marker([o.lat, o.lng], { icon: olIcon(o), keyboard: true, title: `${o.name || "Official spot"} — ${label}`, alt: `${o.name || "Official spot"}, official ${label}` }).addTo(g);
    });
    g.addTo(map); OL.group = g;
    if (!list.length) olSay(navigator.onLine === false ? "No signal — this phone has no saved official spots for this view yet." : "No official spots in this view.");
    else if (capped || skippedCells) olSay("Showing the official spots nearest the middle — zoom in to see them all.");
    else olSay("");
  }

  async function olRefresh() {
    if (!OL.on || !map) return;
    const seq = ++OL.seq;
    if (map.getZoom() < OL.minZoom) { olClear(); olSay("Zoom in to see official spots."); return; }
    const b = map.getBounds(), c = map.getCenter();
    const keys = officialCellsAround(c, (b.getNorth() - b.getSouth()) / 2, (b.getEast() - b.getWest()) / 2);
    const midDist = k => { const [i, j] = k.split(",").map(Number); return miles(c.lat, c.lng, (i + 0.5) * OFFICIAL_CELL, (j + 0.5) * OFFICIAL_CELL); };
    const near = keys.sort((a, z) => midDist(a) - midDist(z)).slice(0, OFFICIAL_MAX_CELLS);   // never more squares than the phone keeps
    const skipped = keys.length - near.length;
    if (near.some(k => !officialCells[k] || Date.now() - officialCells[k].t >= OFFICIAL_AGE)) {
      if (!OL.group) olSay("Loading official spots…");
      let changed = false;
      try { changed = (await Promise.all(near.map(officialLoadCell))).some(Boolean); } catch (e) { /* offline: what this phone already holds is drawn */ }
      if (seq !== OL.seq || !OL.on) return;   // the map moved again, or the switch was turned off, while we waited
      if (changed) { officialRebuild(); officialSave(c); }
    }
    olDraw(skipped);
  }

  function olRefreshSoon() { clearTimeout(OL.timer); OL.timer = setTimeout(olRefresh, 400); }

  function olToggle() {
    initMap();
    if (!map) return;
    OL.on = !OL.on;
    const b = $("mx-official");
    b.classList.toggle("on", OL.on); b.setAttribute("aria-pressed", String(OL.on));
    mxOn.official = OL.on;   // so the note line (mxNote in js/09) includes this layer's message while it is on
    if (!OL.on) { OL.seq++; clearTimeout(OL.timer); olClear(); olSay(""); return; }
    if (!map._olBound) { map._olBound = true; map.on("moveend", olRefreshSoon); }
    olRefresh();
  }
  $("mx-official").addEventListener("click", olToggle);
