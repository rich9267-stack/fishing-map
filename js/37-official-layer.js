  // ---- ✅ Official public spots map layer (steps 1–5: the switch, the pins, the tap card, the filter buttons, "More from FWC", Directions / Save / Start a trip) ----
  // One switch in Map › Layers (first in the Fishing group) that draws the official places on the map: boat ramps, piers / jetties / bridges,
  // park bank-fishing, and places an admin made official (⭐). The data is the same `officialSpots` list that Find new water and Quick catch use
  // (js/02): the app loads it one 0.5° square ("cell") at a time and keeps at most OFFICIAL_MAX_CELLS squares on the phone, so this layer only
  // asks for the squares nearest the middle of the map and draws what falls inside the view. Pins show from zoom 9; further out you get a plain line.
  // Tap a pin = a small card (olPopup): name, kind, county, who the information comes from, "check before you go", ramp facts, and the red 🚫 line inside a no-fishing zone.
  // Filter buttons (#ol-filters, under the switch in the Layers sheet, only while the layer is on): Ramps · Piers & jetties · Parks · Admin-added, all on to start.
  // Every place counts in exactly ONE group: an admin-made place is "Admin-added" whatever its kind, everything else is its own kind. Turning a button off hides that group.
  // "More from FWC" (ramp cards only): the saved `source_id` of an FWC ramp IS FWC's RampID, so one live request fetches status, condition, dock, amenities,
  // phone and address. It fills in after the card opens; offline, slow, or no record = the lines quietly stay out. Answers are kept for this visit.
  // Card buttons: Directions (official places are public, so the exact spot is fine) · Save as my spot (a PRIVATE spot, same fields as "+ Add to my spots" in Find new water;
  // a place within ~150 m of one of your spots counts as already saved and shows "✓ Saved") · Start a trip here (saves it first if needed, then starts the trip like ▶ Start trip).
  // The old ⛵ Boat ramps layer is gone (v127): ramps live here only, and only open public-use ones show.
  // Outside Florida (US plan step 5): boat ramps and piers from OpenStreetMap for the view on screen (js/58, source "osm"); same pins and buttons,
  // the card shows how sure we are it is public instead of "✅". Florida views ask nothing new and look exactly as before.
  const OL = { minZoom: 9, max: 400, on: false, group: null, seq: 0, timer: null, skipped: 0, show: { ramp: true, pier: true, park: true, admin: true } };
  const olKind = o => (o.kind === "ramp" ? "ramp" : (o.kind === "pier" || o.kind === "jetty" || o.kind === "bridge") ? "pier" : "park");
  const olGroup = o => (o.source === "admin" ? "admin" : olKind(o));   // which filter button a place belongs to
  const OL_SYMBOL = { ramp: "⛵", pier: "🎣", park: "🌳" };

  function olIcon(o) {
    const k = olKind(o);
    return L.divIcon({ className: "ol-icon", iconSize: [28, 28], iconAnchor: [14, 14],
      html: `<span class="ol-pin ol-${k}" aria-hidden="true">${OL_SYMBOL[k]}${o.source === "admin" ? '<span class="ol-star">⭐</span>' : ""}</span>` });
  }
  const OL_FWC_URL = "https://gis.myfwc.com/mapping/rest/services/Open_Data/FWC_Florida_Boat_Ramp_Inventory/MapServer/4/query";
  const olMore = {};   // RampID -> the answer (or null when FWC had nothing / could not be reached)
  async function olFetchMore(id) {
    if (id in olMore) return olMore[id];
    const ctl = typeof AbortController === "function" ? new AbortController() : null, t = setTimeout(() => ctl && ctl.abort(), 8000);
    try {
      const qs = new URLSearchParams({ where: "RampID='" + String(id).replace(/[^A-Za-z0-9_-]/g, "") + "'", outFields: "Status,RampCondition,DockType,Amenities,ContactPhone,Street1,City",
        returnGeometry: "false", f: "json" });
      const r = await fetch(OL_FWC_URL + "?" + qs, ctl ? { signal: ctl.signal } : undefined);
      if (!r.ok) throw new Error("http " + r.status);
      const j = await r.json(), a = j && j.features && j.features[0] && j.features[0].attributes;
      return (olMore[id] = a || null);
    } catch (e) { return null; /* not remembered: the next tap tries again */ }
    finally { clearTimeout(t); }
  }
  function olMoreLines(a) {
    const v = x => (x == null || String(x).trim() === "" ? null : String(x).trim());
    const rows = [["Status", v(a.Status)], ["Condition", v(a.RampCondition)], ["Dock", v(a.DockType)], ["Amenities", v(a.Amenities)], ["Phone", v(a.ContactPhone)],
      ["Address", [v(a.Street1), v(a.City)].filter(Boolean).join(", ") || null]].filter(r => r[1]);
    return rows.map(r => r[0] + ": " + r[1]);
  }
  const olSavedSpot = o => (spots || []).find(s => hasLoc(s) && miles(s.lat, s.lng, o.lat, o.lng) < 0.1) || null;   // same "already saved" rule as Find new water
  async function olSaveAsMySpot(o) {   // resolves to the saved spot; throws a plain-words Error when it can't
    const have = olSavedSpot(o);
    if (have) return have;
    if (!db || !me) throw new Error("Sign in and get a signal first.");
    const osm = o.source === "osm", g = { src: o.source, trust: osm ? o.trust : "official" }, st = stationFor({ lat: o.lat, lng: o.lng });
    const row = {
      name: o.name || "Official spot",
      spot_type: OFFICIAL_KINDS[o.kind] || "dock",
      water_type: o.water_type || (st && st.dist != null && st.dist < 1.5 ? "saltwater" : "brackish"),
      public_access: osm && o.trust !== "public" ? "unsure" : "yes", added_by: me.name, lat: o.lat, lng: o.lng, is_private: true, visibility: "private",
      notes: `Added from the official spots map layer (${o.credit || suggSourceName(g)}). Check the water type before you rely on it.`
    };
    const { data, error } = await db.from("spots").insert(row).select("*").single();
    if (error) throw error;
    if (!(spots || []).some(s => s.id === data.id)) spots = (spots || []).concat(data);
    if (typeof loadSpots === "function") loadSpots();   // refresh the lists; the spot is already in `spots`
    return data;
  }
  function olButtons(o) {
    const row = el("div", "ol-acts"), msg = el("div", "pop-meta ol-msg");
    const dir = el("a", "btn ghost small", "Directions ↗");
    dir.href = `https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lng}`; dir.target = "_blank"; dir.rel = "noopener";
    const save = el("button", "btn small", "+ Save as my spot"), trip = el("button", "btn ghost small", "▶ Start a trip here");
    save.type = "button"; trip.type = "button";
    const refresh = () => {
      const sp = olSavedSpot(o), a = typeof activeSession === "function" ? activeSession() : null;
      save.textContent = sp ? "✓ Saved" : "+ Save as my spot"; save.disabled = !!sp;
      trip.textContent = sp && a && a.spot_id === sp.id ? "⏹ End trip" : "▶ Start a trip here";
    };
    const busy = (b, on, text) => { b.disabled = on; if (on) b.textContent = text; };
    save.addEventListener("click", async () => {
      busy(save, true, "Saving…"); msg.textContent = "";
      try { await olSaveAsMySpot(o); msg.textContent = "Saved as a private spot — find it in My spots."; }
      catch (e) { msg.textContent = "Couldn't save it: " + (e.message || e); }
      refresh();
    });
    trip.addEventListener("click", async () => {
      busy(trip, true, "Starting…"); msg.textContent = "";
      try {
        const sp = await olSaveAsMySpot(o), a = activeSession();
        if (a && a.spot_id === sp.id) await endSession(false); else await startSession(sp);
        if (map) map.closePopup();
      } catch (e) { msg.textContent = "Couldn't start the trip: " + (e.message || e); }
      refresh();
    });
    refresh();
    [dir, save, trip].forEach(b => row.appendChild(b));
    if (me && adminCan("official_places") && typeof adminOfficialFix === "function" && o.id != null) {
      const fix = el("button", "btn ghost small", "🛠 Fix this place (admin)"); fix.type = "button";
      fix.addEventListener("click", () => { if (map) map.closePopup(); adminOfficialFix(o); });
      row.appendChild(fix);
    }
    row.appendChild(msg);
    return row;
  }
  const OL_CREDIT = { admin: "Added by an admin of this app", osm: "OpenStreetMap (a volunteer map, not an official list) — make sure it is open to the public" };
  // The tap card. Built from the saved list only (no network), so it opens instantly and works offline.
  function olPopup(o) {
    const d = o.details || {}, box = document.createElement("div");
    const label = /hand/i.test(d.type || "") ? "Hand launch (kayak)" : (OFFICIAL_LABEL[o.kind] || "Fishing spot");
    box.appendChild(el("div", "pop-name", `${OL_SYMBOL[olKind(o)]} ${o.name || "Official spot"}${o.source === "admin" ? " ⭐" : ""}`));
    const county = o.county ? o.county.charAt(0) + o.county.slice(1).toLowerCase() + " County" : "";
    const badge = o.source === "osm" && typeof trustOf === "function" ? trustOf(o).badge + " · " : "✅ ";   // OpenStreetMap places: how sure we are it is public
    box.appendChild(el("div", "pop-meta", [badge + label, county].filter(Boolean).join(" · ")));
    const facts = officialFacts({ info: d, county: null });   // lanes, fee, hours, water, who runs it (the county is already on the line above)
    if (facts) box.appendChild(el("div", "pop-meta", facts));
    const runBy = el("div", "pop-meta"); box.appendChild(runBy);   // "🏪 Run by <business page>" when a page has linked this place (js/71)
    if (typeof bpPlaceLine === "function") bpPlaceLine(o, runBy);
    if (o.source === "fwc-ramp" && o.source_id) {   // "More from FWC": filled in a moment later; stays out if there is no signal
      const more = el("div", "ol-more"); box.appendChild(more);
      olFetchMore(o.source_id).then(a => {
        const lines = a ? olMoreLines(a) : [];
        if (!lines.length) return;
        more.appendChild(el("div", "pop-meta ol-more-h", "More from FWC"));
        lines.forEach(t => more.appendChild(el("div", "pop-meta", t)));
      });
    }
    const zoneBox = el("div", "ol-zone"); box.appendChild(zoneBox);
    const fillZone = () => {   // the red 🚫 line; the list of closed areas may still be arriving, so fill it again when it lands
      zoneBox.textContent = "";
      const zr = typeof zoneRow === "function" ? zoneRow({ id: "official/" + o.id, lat: o.lat, lng: o.lng }) : null;
      if (zr) zoneBox.appendChild(zr);
    };
    fillZone();
    const wait = typeof zonesEnsure === "function" ? zonesEnsure() : null;
    if (wait && wait.then) wait.then(fillZone, () => {});
    box.appendChild(el("div", "pop-meta", "Source: " + (OL_CREDIT[o.source] || o.credit || OFFICIAL_SOURCE[o.source] || "Florida's official public spots list")));
    box.appendChild(el("div", "pop-meta ol-check", "Check before you go — reference only, not for navigation."));
    box.appendChild(olButtons(o));
    return box;
  }
  function olSay(text) { mxMsg.official = text; mxNote(); }   // the plain line under the map buttons (same place the other layers talk)
  function olClear() { if (OL.group) { map.removeLayer(OL.group); OL.group = null; } }

  function olDraw(skippedCells) {
    if (!map || !OL.on) return;
    olClear();
    const box = map.getBounds().pad(0.1), c = map.getCenter();
    const osm = typeof outsideItems === "function" ? outsideItems() : typeof osmOlItems === "function" ? osmOlItems() : [], note = typeof outsideNote === "function" ? outsideNote() : typeof osmOlNote === "function" ? osmOlNote() : "";   // js/61 + js/58 (outside Florida only)
    const inView = (officialSpots || []).concat(osm).filter(o => o.lat != null && o.lng != null && box.contains([o.lat, o.lng]));
    let list = inView.filter(o => OL.show[olGroup(o)]);   // the filter buttons
    let capped = false;
    if (list.length > OL.max) {   // a very busy view: keep the ones nearest the middle
      capped = true;
      const dist = o => (o.lat - c.lat) * (o.lat - c.lat) + (o.lng - c.lng) * (o.lng - c.lng);
      list = list.sort((a, b) => dist(a) - dist(b)).slice(0, OL.max);
    }
    const g = L.layerGroup();
    list.forEach(o => {
      const label = (OFFICIAL_LABEL[o.kind] || "Fishing spot");
      L.marker([o.lat, o.lng], { icon: olIcon(o), keyboard: true, title: `${o.name || "Official spot"} — ${label}`, alt: `${o.name || "Official spot"}, ${o.source === "osm" ? "OpenStreetMap" : "official"} ${label}` }).bindPopup(() => olPopup(o)).addTo(g);
    });
    g.addTo(map); OL.group = g;
    if (!list.length && inView.length) olSay("Nothing to show — every kind of spot in this view is switched off. Tap the buttons under the switch to turn some back on.");
    else if (!list.length) olSay(navigator.onLine === false ? "No signal — this phone has no saved official spots for this view yet." : note || "No official spots in this view.");
    else if (capped || skippedCells) olSay("Showing the official spots nearest the middle — zoom in to see them all.");
    else olSay(note);
  }

  async function olRefresh() {
    if (!OL.on || !map) return;
    const seq = ++OL.seq;
    if (map.getZoom() < OL.minZoom) { olClear(); olSay("Zoom in to see official spots."); return; }
    const b = map.getBounds(), c = map.getCenter();
    // outside Florida: ramps and piers from OpenStreetMap for this view (js/58; asks nothing for an all-Florida view), fetched while the cells load
    const osmWait = typeof outsideLoad === "function" ? outsideLoad(b) : typeof osmOlLoad === "function" ? osmOlLoad(b) : null;
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
    OL.skipped = skipped; olDraw(skipped);
    if (osmWait) {
      const said = outsideNote(), changed = await osmWait;
      if (seq !== OL.seq || !OL.on) return;
      if (changed || outsideNote() !== said) olDraw(skipped);   // an all-Florida view: nothing new, same (empty) note, so nothing is redrawn
    }
  }

  function olRefreshSoon() { clearTimeout(OL.timer); OL.timer = setTimeout(olRefresh, 400); }

  function olToggle() {
    initMap();
    if (!map) return;
    OL.on = !OL.on;
    const b = $("mx-official");
    b.classList.toggle("on", OL.on); b.setAttribute("aria-pressed", String(OL.on));
    mxOn.official = OL.on;   // so the note line (mxNote in js/09) includes this layer's message while it is on
    const fb = $("ol-filters"); if (fb) fb.hidden = !OL.on;   // the four buttons show only while the layer is on
    if (!OL.on) { OL.seq++; clearTimeout(OL.timer); olClear(); olSay(""); return; }
    if (!map._olBound) { map._olBound = true; map.on("moveend", olRefreshSoon); }
    olRefresh();
  }
  $("mx-official").addEventListener("click", olToggle);
  document.querySelectorAll("#ol-filters [data-olf]").forEach(btn => btn.addEventListener("click", () => {
    const k = btn.dataset.olf;
    OL.show[k] = !OL.show[k];
    btn.classList.toggle("on", OL.show[k]); btn.setAttribute("aria-pressed", String(OL.show[k]));
    if (OL.on && map && map.getZoom() >= OL.minZoom) olDraw(OL.skipped);   // redraw from what the phone already holds: no new download
  }));
