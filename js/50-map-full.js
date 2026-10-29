  // ---- 🗺 Full-screen map (plans/ui-review.md 2A): floating buttons, the ⋯ More menu, notes dot on Layers, and 🔍 Search the map ----
  // The page layout is CSS (body.on-map in css/app.css). The old buttons keep their ids and handlers; they just live in new places.
  (function mapFull() {
    const more = $("map-more"), moreBtn = $("map-more-btn"), notes = $("map-notes"), dot = $("map-notes-dot");
    // The bottom bar's height, so the map ends exactly on top of it
    function bnavHeight() {
      const b = document.querySelector("#bnav .bnav-in");
      if (b && b.offsetHeight) document.documentElement.style.setProperty("--bnav-h", b.offsetHeight + "px");
    }
    bnavHeight(); window.addEventListener("resize", bnavHeight);
    new MutationObserver(bnavHeight).observe(document.body, { attributes: true, attributeFilter: ["class"] });
    // A bar appearing above the map (offline, trip running…) makes the map shorter: tell Leaflet so the tiles fill it
    if (window.ResizeObserver) new ResizeObserver(() => { if (map) map.invalidateSize(); }).observe($("map"));

    // ⋯ More menu
    const items = () => [...more.querySelectorAll("[role=menuitem]")];
    function openMore() {
      closeResults();
      more.hidden = false; moreBtn.setAttribute("aria-expanded", "true");
      items()[0].focus();
    }
    function closeMore(focusBtn) {
      if (more.hidden) return;
      more.hidden = true; moreBtn.setAttribute("aria-expanded", "false");
      if (focusBtn) moreBtn.focus();
    }
    moreBtn.addEventListener("click", () => (more.hidden ? openMore() : closeMore(true)));
    more.addEventListener("click", e => { if (e.target.closest("[role=menuitem]")) closeMore(false); });
    more.addEventListener("keydown", e => {
      const list = items(), i = list.indexOf(document.activeElement);
      const go = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: list.length - 1 }[e.key];
      if (go !== undefined) { e.preventDefault(); list[(go + list.length) % list.length].focus(); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeMore(true); }
      else if (e.key === "Tab") closeMore(false);
    });
    document.addEventListener("click", e => { if (!more.hidden && !more.contains(e.target) && !moreBtn.contains(e.target)) closeMore(false); });
    $("map-layers-btn").addEventListener("click", () => { closeMore(false); closeResults(); });
    $("map-help").addEventListener("click", () => $("help-btn").click());   // the top bar is hidden on the map, so Help lives in ⋯ More
    // Map key: opens the Layers sheet at the key
    $("map-key-btn").addEventListener("click", () => {
      if ($("layers-sheet").hidden) $("map-layers-btn").click();
      const k = $("map-key"); k.open = true;
      k.scrollIntoView({ block: "nearest" });
      k.querySelector("summary").focus();
    });
    // The Find new water sheet's Done: its button now sits in the closed menu, so focus goes back to ⋯ More
    $("find-done").addEventListener("click", () => moreBtn.focus());

    // Notes (what a layer is showing, loading, or why it's empty) live in the Layers sheet; a dot on 🗂 Layers says there is one to read
    function notesDot() {
      const sn = $("sat-note"), sh = $("sat-legend").hidden, dh = ![...notes.children].some(n => !n.hidden && n.textContent.trim() && (n !== sn || !sh));
      if (sn.hidden !== sh) sn.hidden = sh;   // only write when it changes, or the watcher below would wake itself forever
      if (dot.hidden !== dh) dot.hidden = dh;
    }
    new MutationObserver(notesDot).observe(notes, { attributes: true, attributeFilter: ["hidden"], childList: true, characterData: true, subtree: true });
    new MutationObserver(notesDot).observe($("sat-legend"), { attributes: true, attributeFilter: ["hidden"] });
    notesDot();

    // ---- 🔍 Search the map: your own spot names first (on the phone, as you type), then places (Photon, only when you press Search) ----
    // Photon (photon.komoot.io) is a free OpenStreetMap search; we send at most one search a second and remember answers, to stay fair.
    const form = $("map-search"), q = $("ms-q"), box = $("ms-results");
    const PHOTON = "https://photon.komoot.io/api/";
    const cache = new Map();
    let lastAsk = 0, active = -1, opts = [], hit = null, asking = 0;
    const norm = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    function spotMatches(text) {
      const n = norm(text); if (!n) return [];
      return (spots || []).filter(s => s.lat != null && s.lng != null && norm(s.name).includes(n))
        .map(s => { const m = norm(s.name); return { s, rank: m.startsWith(n) ? 0 : (" " + m).includes(" " + n) ? 1 : 2 }; })
        .sort((a, b) => a.rank - b.rank || a.s.name.localeCompare(b.s.name)).slice(0, 6).map(x => x.s);
    }
    function closeResults() {
      box.hidden = true; q.setAttribute("aria-expanded", "false"); q.removeAttribute("aria-activedescendant"); active = -1;
    }
    function setActive(i) {
      active = i;
      opts.forEach((o, k) => o.li.setAttribute("aria-selected", String(k === i)));
      if (i >= 0) { q.setAttribute("aria-activedescendant", opts[i].li.id); opts[i].li.scrollIntoView({ block: "nearest" }); }
      else q.removeAttribute("aria-activedescendant");
    }
    // rows: [{head}] / [{msg}] / [{label, sub, pick}]
    function show(rows) {
      box.innerHTML = ""; opts = []; active = -1; q.removeAttribute("aria-activedescendant");
      rows.forEach(r => {
        const li = el("li");
        if (r.head) { li.className = "ms-head"; li.setAttribute("role", "presentation"); li.textContent = r.head; }
        else if (r.msg) { li.className = "ms-msg"; li.setAttribute("role", "presentation"); li.textContent = r.msg; }
        else {
          li.className = "ms-opt"; li.id = "ms-opt-" + opts.length; li.setAttribute("role", "option"); li.setAttribute("aria-selected", "false");
          li.appendChild(el("span", null, r.label)); if (r.sub) li.appendChild(el("small", null, r.sub));
          li.addEventListener("mousedown", e => e.preventDefault());   // keep the box open until the tap lands
          li.addEventListener("click", r.pick);
          opts.push({ li, pick: r.pick });
        }
        box.appendChild(li);
      });
      box.hidden = !rows.length; q.setAttribute("aria-expanded", String(!!rows.length));
    }
    function localRows(text) {
      const rows = [], mine = spotMatches(text);
      if (mine.length) {
        rows.push({ head: "Your spots" });
        mine.forEach(s => rows.push({ label: s.name, sub: `${cap(s.spot_type || "spot")} · ${WATER_LABEL[s.water_type] || s.water_type || ""}`, pick: () => pickSpot(s) }));
      }
      if (norm(text).length >= 2) rows.push({ label: `🔎 Search places for “${text.trim()}”`, sub: "Towns, parks, piers, ramps, addresses", pick: () => placeSearch(text) });
      return rows;
    }
    function done(label) { q.value = label; closeResults(); q.blur(); }
    function pickSpot(s) {
      done(s.name);
      initMap();
      if (!map) return;
      map.setView([s.lat, s.lng], Math.max(map.getZoom(), 15));
      if (hit) { map.removeLayer(hit); hit = null; }
      if (pinLayer) pinLayer.eachLayer(m => { if (m.options && m.options.spotId === s.id) m.openPopup(); });
    }
    function placeLabel(p) {
      const name = p.name || [p.housenumber, p.street].filter(Boolean).join(" ") || p.city || "Place";
      const kind = p.osm_value && !/^(yes|unclassified|residential)$/.test(p.osm_value) ? cap(String(p.osm_value).replace(/_/g, " ")) : "";
      const sub = [kind, [p.city || p.county, p.state].filter((v, i, a) => v && v !== name && a.indexOf(v) === i).join(", ")].filter(Boolean).join(" · ");
      return { name, sub };
    }
    function pickPlace(f) {
      const [lng, lat] = f.geometry.coordinates, { name, sub } = placeLabel(f.properties || {}), ext = (f.properties || {}).extent;
      done(name);
      initMap(); if (!map) return;
      if (ext && ext.length === 4) map.fitBounds([[ext[3], ext[0]], [ext[1], ext[2]]], { maxZoom: 16 });
      else map.setView([lat, lng], 15);
      if (hit) map.removeLayer(hit);
      const pop = el("div");
      pop.appendChild(el("b", null, name)); if (sub) { pop.appendChild(el("br")); pop.appendChild(el("span", "spot-meta", sub)); }
      const add = el("button", "btn small", "+ Add a spot here"); add.type = "button"; add.style.marginTop = "8px"; add.style.display = "block";
      add.addEventListener("click", () => { map.closePopup(); startPlacing({ mode: "new" }); onMapTap(L.latLng(lat, lng)); });
      pop.appendChild(add);
      hit = L.marker([lat, lng], { icon: L.divIcon({ className: "", html: '<div class="ms-hit"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), keyboard: false, alt: name })
        .addTo(map).bindPopup(pop).openPopup();
    }
    async function placeSearch(text) {
      text = text.trim(); if (norm(text).length < 2) return;
      const c = map ? map.getCenter() : { lat: LAT, lng: LNG };
      const url = `${PHOTON}?q=${encodeURIComponent(text)}&limit=6&lang=en&lat=${c.lat.toFixed(2)}&lon=${c.lng.toFixed(2)}`;
      const mine = localRows(text).filter(r => !r.label || !/^🔎/.test(r.label));
      show(mine.concat([{ head: "Places" }, { msg: "Searching…" }]));
      const ask = ++asking;
      const ckey = norm(text) + "|" + Math.round(c.lat) + "," + Math.round(c.lng);   // same words in the same area → answer from memory
      let feats = cache.get(ckey);
      if (!feats) {
        const wait = 1000 - (Date.now() - lastAsk);   // at most one search a second
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
        if (ask !== asking) return;
        lastAsk = Date.now();
        try {
          const ctl = window.AbortController ? new AbortController() : null;
          const t = ctl && setTimeout(() => ctl.abort(), 10000);
          const r = await fetch(url, ctl ? { signal: ctl.signal } : {});
          if (t) clearTimeout(t);
          if (!r.ok) throw new Error("HTTP " + r.status);
          feats = ((await r.json()).features || []).filter(f => f.geometry && Array.isArray(f.geometry.coordinates));
          cache.set(ckey, feats);
        } catch (e) {
          if (ask === asking) show(mine.concat([{ head: "Places" }, { msg: "Place search isn't working right now — check your connection and try again." }]));
          return;
        }
      }
      if (ask !== asking || norm(q.value) !== norm(text)) return;
      const rows = feats.map(f => { const { name, sub } = placeLabel(f.properties || {}); return { label: name, sub, pick: () => pickPlace(f) }; });
      show(mine.concat([{ head: "Places" }], rows.length ? rows : [{ msg: "No places found — try another name." }]));
    }
    q.addEventListener("input", () => {
      asking++;
      if (!q.value.trim()) { closeResults(); if (hit && map) { map.removeLayer(hit); hit = null; } return; }
      show(localRows(q.value));
    });
    q.addEventListener("focus", () => { closeMore(false); if (q.value.trim()) show(localRows(q.value)); });
    q.addEventListener("keydown", e => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (box.hidden) { if (q.value.trim()) show(localRows(q.value)); }
        if (!opts.length) return;
        e.preventDefault();
        setActive(e.key === "ArrowDown" ? (active + 1) % opts.length : (active <= 0 ? opts.length - 1 : active - 1));
      } else if (e.key === "Escape") {
        if (!box.hidden) { e.preventDefault(); e.stopPropagation(); closeResults(); }
      }
    });
    form.addEventListener("submit", e => {
      e.preventDefault();
      if (active >= 0 && opts[active]) { opts[active].pick(); return; }
      placeSearch(q.value);
    });
    document.addEventListener("click", e => { if (!box.hidden && !form.contains(e.target)) closeResults(); });
  })();
