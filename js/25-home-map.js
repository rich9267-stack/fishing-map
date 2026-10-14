  // ---- 🧭 UX v2 step 2: short Home (quick buttons, weather sheet, start-trip chooser) + Map "Layers" and "Find new water" sheets ----
  // The real layer buttons (map-bite, mx-chart …) keep their ids and handlers; they live in the hidden #layer-real box.
  // Each switch row in the Layers sheet clicks its real button and copies its on/off state back, so every layer works exactly as before.
  (function layerSheets() {
    const lay = $("layers-sheet"), find = $("find-sheet"), lb = $("map-layers-btn"), fb = $("map-find-btn");
    const isOn = {
      "map-layer": b => /Street map/.test(b.textContent),
      "map-sugg": b => /Hide/.test(b.textContent)
    };
    const rowOn = b => (isOn[b.id] ? isOn[b.id](b) : b.classList.contains("on") || b.getAttribute("aria-pressed") === "true");
    const rows = [...document.querySelectorAll("#layers-body .lyr")];
    function syncRow(r) {
      const b = $(r.dataset.for); if (!b) return;
      const on = rowOn(b);
      r.setAttribute("aria-checked", String(on)); r.classList.toggle("on", on);
    }
    const syncAll = () => rows.forEach(syncRow);
    rows.forEach(r => {
      const b = $(r.dataset.for); if (!b) return;
      r.addEventListener("click", () => { b.click(); syncRow(r); });
      new MutationObserver(() => syncRow(r)).observe(b, { attributes: true, attributeFilter: ["class", "aria-pressed"], childList: true, characterData: true, subtree: true });
    });
    syncAll();
    function setBody() { document.body.classList.toggle("sheet-open", !lay.hidden || !find.hidden); }
    function openSheet(which) {
      const other = which === lay ? find : lay;
      other.hidden = true; which.hidden = false;
      lb.setAttribute("aria-expanded", String(which === lay)); fb.setAttribute("aria-expanded", String(which === find));
      if (which === lay) syncAll();
      setBody();
      const h = which.querySelector("h2"); if (h) { h.tabIndex = -1; try { h.focus({ preventScroll: true }); } catch (e) { /* fine */ } }
    }
    function closeSheets() {
      lay.hidden = true; find.hidden = true;
      lb.setAttribute("aria-expanded", "false"); fb.setAttribute("aria-expanded", "false");
      setBody();
    }
    window.closeMapSheets = closeSheets; // showView() calls this when you leave the map
    lb.addEventListener("click", () => { if (lay.hidden) { initMap(); openSheet(lay); } else { closeSheets(); lb.focus(); } });
    fb.addEventListener("click", () => { if (find.hidden) openSheet(find); else { closeSheets(); fb.focus(); } });
    $("layers-done").addEventListener("click", () => { closeSheets(); lb.focus(); });
    $("find-done").addEventListener("click", () => { closeSheets(); fb.focus(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && (!lay.hidden || !find.hidden)) closeSheets(); });
    // "Map" on a suggestion / lake: close the sheet so the map shows
    find.addEventListener("click", e => { if (e.target.closest(".sugg-btns")) setTimeout(closeSheets, 0); });
  })();

  // ---- Home: the whole conditions strip opens the full weather, tides & moon details as a full-screen page ----
  (function condSheet() {
    const d = $("cond-more");
    function setOpen(on) {
      d.open = on; d.classList.toggle("as-sheet", on);
      document.body.classList.toggle("cond-open", on);
    }
    window.openCondSheet = () => setOpen(true);
    $("cond-close").addEventListener("click", () => { setOpen(false); const t = document.querySelector("#today-strip .tile"); if (t && t.focus) t.focus(); });
    d.addEventListener("toggle", () => { if (!d.open) { d.classList.remove("as-sheet"); document.body.classList.remove("cond-open"); } });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && d.classList.contains("as-sheet")) setOpen(false); });
  })();

  // ---- ▶ Start trip (Home quick button): pick the spot, then it works like the ▶ Start trip on a spot ----
  (function startTrip() {
    const sheet = $("trip-sheet"), sel = $("tr-spot"), note = $("tr-note");
    let pos = null;
    function fill() {
      const list = (spots || []).filter(s => s && s.id);
      sel.innerHTML = "";
      if (!list.length) { note.textContent = "Add a spot first (Home → My spots → + New spot), then start a trip there."; $("tr-go").disabled = true; return; }
      $("tr-go").disabled = false;
      let items = list.map(s => ({ s, d: pos && hasLoc(s) ? miles(pos.lat, pos.lng, s.lat, s.lng) : null }));
      items.sort((a, b) => (a.d == null) - (b.d == null) || (a.d != null ? a.d - b.d : String(a.s.name).localeCompare(String(b.s.name))));
      items.forEach(x => { const o = document.createElement("option"); o.value = x.s.id; o.textContent = x.s.name + (x.d != null ? ` · ${fmtDist(x.d)}` : ""); sel.appendChild(o); });
      note.textContent = pos ? "Closest spots first." : "";
    }
    async function open() {
      pos = null; fill(); sheet.hidden = false; sel.focus();
      // only use your location if this phone already allowed it (so this never pops a permission question)
      try {
        if (navigator.geolocation && navigator.permissions) {
          const p = await navigator.permissions.query({ name: "geolocation" });
          if (p.state === "granted") navigator.geolocation.getCurrentPosition(g => { pos = { lat: g.coords.latitude, lng: g.coords.longitude }; if (!sheet.hidden) fill(); }, () => {}, { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 });
        }
      } catch (e) { /* fine */ }
    }
    const close = () => { sheet.hidden = true; };
    $("hq-start").addEventListener("click", open);
    $("tr-cancel").addEventListener("click", close);
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !sheet.hidden) close(); });
    $("trip-form").addEventListener("submit", e => {
      e.preventDefault();
      const sp = (spots || []).find(x => x.id === sel.value);
      if (sp) startSession(sp);
      close();
    });
  })();
