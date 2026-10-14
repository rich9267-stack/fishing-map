  // ---- 🏞 Public fishing water from FWC (Fishbrain audit item 11): free state data so a new friend doesn't start with an empty map ----
  // Two FWC layers: Fish Management Areas (public lakes FWC stocks and manages — outlines, ~140 statewide, loaded once and
  // kept on the phone for 30 days) and freshwater fish attractors (brush piles / structure FWC sinks in lakes — points,
  // asked for the part of the map you're looking at). Map button "🏞 Public lakes (FWC)"; a "Public lakes near you" card on
  // the Spots list. Every one has "+ Add to my spots" (fills in the spot form — the person checks and saves).
  const PW = {
    fmaUrl: "https://gis.myfwc.com/hosting/rest/services/Open_Data/Fish_Management_Areas_Florida/MapServer/3/query",
    attUrl: "https://gis.myfwc.com/mapping/rest/services/Projects_FWC/Freshwater_Fish_Attractors/MapServer/0/query",
    rulesUrl: "https://myfwc.com/fishing/freshwater/regulations/fish-management-areas/",
    cacheKey: "fm-fwc-fma-v1", cacheDays: 30, attMinZoom: 10
  };
  const pwTitle = x => String(x || "").trim().toLowerCase().replace(/(^|[\s-])\w/g, m => m.toUpperCase());   // PALM BEACH → Palm Beach
  let pwFma = null, pwFmaErr = "", pwFmaBusy = false, pwOn = false, pwLayer = null, pwAttLayer = null, pwAttSeq = 0, pwAttMsg = "", pwShowAll = false;

  // every Fish Management Area as { key, name, county, lat, lng, geo } — lat/lng is the middle of the lake's outline
  function pwFromGeojson(d) {
    return (d.features || []).map((f, i) => {
      const p = f.properties || {};
      if (!f.geometry) return null;
      let b; try { b = L.geoJSON(f).getBounds(); } catch (e) { return null; }
      if (!b || !b.isValid()) return null;
      const c = b.getCenter(), name = String(p.NAME || p.ALTNAME || "Fish Management Area").trim();
      return { key: "fma-" + (p.OBJECTID != null ? p.OBJECTID : i), name, county: pwTitle(p.COUNTY), lat: c.lat, lng: c.lng, geo: f };
    }).filter(Boolean);
  }
  async function pwLoadFma(force) {
    if (pwFmaBusy) return;
    if (!force && pwFma) return;
    if (!force) {
      try {
        const c = JSON.parse(localStorage.getItem(PW.cacheKey) || "null");
        if (c && c.at && Date.now() - c.at < PW.cacheDays * 86400000 && c.d) { pwFma = pwFromGeojson(c.d); pwFmaErr = ""; pwAfterLoad(); return; }
      } catch (e) { /* load it fresh */ }
    }
    pwFmaBusy = true;
    try {
      const url = `${PW.fmaUrl}?where=1%3D1&outFields=OBJECTID,NAME,ALTNAME,TYPE,COUNTY&returnGeometry=true&outSR=4326&maxAllowableOffset=0.0003&resultRecordCount=2000&f=geojson`;
      const r = await fetch(url);
      if (!r.ok) throw new Error("bad answer");
      const d = await r.json();
      if (d.error || !Array.isArray(d.features)) throw new Error("bad data");
      pwFma = pwFromGeojson(d); pwFmaErr = "";
      try { localStorage.setItem(PW.cacheKey, JSON.stringify({ at: Date.now(), d })); } catch (e) { /* too big or blocked: fine */ }
    } catch (e) {
      if (!pwFma) pwFmaErr = "Couldn't load FWC's public lakes right now (the state's map service may be down) — try again later.";
    }
    pwFmaBusy = false;
    pwAfterLoad();
  }
  function pwAfterLoad() { renderPwCard(); if (pwOn) pwDraw(); }

  // already saved? (one of your/your friends' spots within ⅓ mile)
  const pwSaved = g => (spots || []).some(s => hasLoc(s) && miles(s.lat, s.lng, g.lat, g.lng) < 0.35);
  function pwNearby() {
    if (!pwFma) return [];
    const a = typeof suggCenter === "function" ? suggCenter() : { lat: LAT, lng: LNG };
    return pwFma.filter(g => !pwSaved(g)).map(g => ({ ...g, dist: miles(a.lat, a.lng, g.lat, g.lng) })).sort((x, y) => x.dist - y.dist);
  }

  // fill in the spot form; the person checks the pin and saves
  function pwAdd(g) {
    if (map) map.closePopup();
    showView("list");
    closeSpotForm();
    openForm(true);
    $("f-name").value = g.name.slice(0, 80);
    $("f-type").value = "shore";
    $("f-water").value = "freshwater";
    if ($("f-access")) $("f-access").value = "yes";
    if ($("f-notes") && !$("f-notes").value) $("f-notes").value = g.att
      ? `FWC fish attractor${g.water ? " in " + g.water : ""}${g.material ? " (" + g.material + ")" : ""} — usually needs a boat or kayak.`
      : "FWC Fish Management Area — stocked and managed by the state. Special rules may apply: " + PW.rulesUrl;
    pickedLoc = { lat: g.lat, lng: g.lng };
    $("loc-text").textContent = g.att ? "Set ✓ (the attractor)" : "Set ✓ (middle of the lake — move it to where you fish)";
    $("form-msg").className = "msg";
    $("form-msg").textContent = g.att ? "Check the details, then save." : "The pin is the middle of the lake — tap 📍 to move it to the bank or pier you fish from, then save.";
    $("spots-card").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function pwPopup(g) {
    const box = document.createElement("div");
    box.appendChild(el("div", "pop-name", (g.att ? "🪵 " : "🏞 ") + g.name));
    if (g.att) {
      [["Lake", g.water], ["What it is", g.material], ["Kind", g.kind], ["Built / refreshed", g.built], ["County", g.county]].forEach(([k, v]) => { if (v) box.appendChild(el("div", "pop-meta", `${k}: ${v}`)); });
      box.appendChild(el("div", "pop-meta", "Fish attractor placed by FWC — brush or structure underwater that holds fish. Usually reached by boat or kayak."));
    } else {
      box.appendChild(el("div", "pop-meta", `FWC Fish Management Area${g.county ? " · " + g.county + " County" : ""}`));
      box.appendChild(el("div", "pop-meta", "A public lake the state stocks and manages. Some have special rules (bag limits, hours, gear)."));
      const a = el("a", "pop-meta", "FWC rules for this lake ↗"); a.href = PW.rulesUrl; a.target = "_blank"; a.rel = "noopener"; box.appendChild(a);
    }
    const dir = el("a", "pop-meta", "Directions ↗"); dir.href = `https://www.google.com/maps/dir/?api=1&destination=${g.lat},${g.lng}`; dir.target = "_blank"; dir.rel = "noopener";
    box.appendChild(dir);
    if (pwSaved(g)) box.appendChild(el("div", "pop-meta", "✓ Already one of your spots."));
    else {
      const actions = el("div", "pop-actions");
      const add = el("button", null, "+ Add to my spots"); add.type = "button";
      add.addEventListener("click", () => pwAdd(g));
      actions.appendChild(add); box.appendChild(actions);
    }
    return box;
  }

  function pwDraw() {
    if (!map) return;
    if (!pwLayer) pwLayer = L.layerGroup();
    pwLayer.clearLayers();
    (pwFma || []).forEach(g => {
      L.geoJSON(g.geo, { style: { color: "#2e8b57", weight: 2, fillColor: "#2e8b57", fillOpacity: 0.15 }, interactive: false }).addTo(pwLayer);
      L.circleMarker([g.lat, g.lng], { radius: 7, color: "#fff", weight: 2, fillColor: "#2e8b57", fillOpacity: 0.95, a11y: `Public lake (FWC): ${g.name}` })
        .bindPopup(() => pwPopup(g)).addTo(pwLayer);
    });
    if (!map.hasLayer(pwLayer)) pwLayer.addTo(map);
    pwLoadAttractors();
  }
  async function pwLoadAttractors() {
    const seq = ++pwAttSeq;
    if (pwAttLayer) { map.removeLayer(pwAttLayer); pwAttLayer = null; }
    if (map.getZoom() < PW.attMinZoom) { pwAttMsg = "Zoom in to see FWC fish attractors (brush piles) inside lakes."; pwNote(); return; }
    pwAttMsg = "Loading fish attractors…"; pwNote();
    try {
      const b = map.getBounds(), bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map(v => v.toFixed(4)).join(",");
      const url = `${PW.attUrl}?where=1%3D1&geometry=${bbox}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects` +
        `&outFields=${encodeURIComponent("OBJECTID_1,NAME,WATERBODY,MATERIAL,COUNTY,BLT_REFURB,Type,Description")}&returnGeometry=true&outSR=4326&resultRecordCount=1000&f=json`;
      const r = await fetch(url);
      if (!r.ok) throw new Error("bad answer");
      const d = await r.json();
      if (seq !== pwAttSeq || !pwOn) return;
      if (d.error || !Array.isArray(d.features)) throw new Error("bad data");
      const g = L.layerGroup(), v = x => (x == null || String(x).trim() === "" ? "" : String(x).trim());
      d.features.forEach(f => {
        if (!f.geometry || f.geometry.y == null) return;
        const a = f.attributes || {};
        const item = { att: true, key: "att-" + a.OBJECTID_1, name: v(a.NAME) || "Fish attractor", water: pwTitle(a.WATERBODY), material: v(a.MATERIAL) || v(a.Description),
          kind: v(a.Type), built: v(a.BLT_REFURB), county: pwTitle(a.COUNTY), lat: f.geometry.y, lng: f.geometry.x };
        L.circleMarker([item.lat, item.lng], { radius: 5, color: "#fff", weight: 1.5, fillColor: "#8b5a2b", fillOpacity: 0.95, a11y: `Fish attractor: ${item.name}` })
          .bindPopup(() => pwPopup(item)).addTo(g);
      });
      g.addTo(map); pwAttLayer = g;
      pwAttMsg = d.features.length ? `🪵 ${d.features.length} fish attractor${d.features.length === 1 ? "" : "s"} in view.` : "No FWC fish attractors in this view.";
    } catch (e) {
      if (seq === pwAttSeq) pwAttMsg = "Couldn't load fish attractors right now — try again later.";
    }
    pwNote();
  }
  function pwNote() {
    const n = $("pw-note"); if (!n) return;
    n.hidden = !pwOn;
    n.textContent = pwOn ? [pwFmaErr || (pwFma ? `🏞 ${pwFma.length} public lakes from FWC (green).` : "Loading FWC public lakes…"), pwAttMsg].filter(Boolean).join(" ") : "";
  }
  function setPwOn(on) {
    pwOn = on;
    const btn = $("mx-water"); if (btn) { btn.classList.toggle("on", on); btn.setAttribute("aria-pressed", String(on)); }
    if (!on) { pwAttSeq++; if (map && pwLayer) map.removeLayer(pwLayer); if (map && pwAttLayer) { map.removeLayer(pwAttLayer); pwAttLayer = null; } pwNote(); return; }
    initMap(); if (!map) return;
    if (!map._pwBound) { map._pwBound = true; let t = null; map.on("moveend", () => { clearTimeout(t); t = setTimeout(() => { if (pwOn) pwLoadAttractors(); }, 400); }); }
    pwNote();
    if (pwFma) pwDraw(); else pwLoadFma();
  }

  // the card on the Spots list: the closest public lakes you haven't saved
  function renderPwCard() {
    const ul = $("pw-list"); if (!ul) return;
    ul.innerHTML = "";
    const more = $("pw-more");
    if (pwFmaErr && !pwFma) { ul.appendChild(el("li", "empty", pwFmaErr)); more.hidden = true; return; }
    if (!pwFma) { ul.appendChild(el("li", "empty", "Loading FWC public lakes…")); more.hidden = true; return; }
    const list = pwNearby();
    const fewSpots = (spots || []).filter(hasLoc).length < 3;
    $("pw-new").hidden = !fewSpots;
    if (!list.length) { ul.appendChild(el("li", "empty", "You've saved every FWC public lake nearby.")); more.hidden = true; return; }
    list.slice(0, pwShowAll ? 15 : 4).forEach(g => {
      const li = el("li"), left = el("div");
      left.appendChild(el("div", "sugg-name", "🏞 " + g.name));
      left.appendChild(el("div", "spot-meta", `${g.county ? g.county + " County · " : ""}${g.dist < 10 ? g.dist.toFixed(1) : Math.round(g.dist)} mi · freshwater`));
      const btns = el("div", "sugg-btns");
      const mapBtn = el("button", "btn ghost small", "Map"); mapBtn.type = "button";
      mapBtn.addEventListener("click", () => { showView("map"); setPwOn(true); if (map) map.setView([g.lat, g.lng], 15); });
      const add = el("button", "btn small", "+ Add"); add.type = "button";
      add.addEventListener("click", () => pwAdd(g));
      btns.appendChild(mapBtn); btns.appendChild(add);
      li.appendChild(left); li.appendChild(btns); ul.appendChild(li);
    });
    more.hidden = list.length <= 4;
    more.textContent = pwShowAll ? "Show fewer" : `Show more (${Math.min(list.length, 15) - 4})`;
  }
  (function pwSetup() {
    const btn = $("mx-water"); if (btn) btn.addEventListener("click", () => setPwOn(!pwOn));
    const more = $("pw-more"); if (more) more.addEventListener("click", () => { pwShowAll = !pwShowAll; renderPwCard(); });
  })();
