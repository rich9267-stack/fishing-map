  // ---- 🎣 Biting now: recent catches on the map (Fishbrain audit item 2) ----
  // Catches from the last 3/7/14/30 days that you're allowed to see: yours and your friends' (already on the phone) plus
  // strangers' public catches (one small query). Each catch is drawn at its SPOT, using the spot's own pin from spots_visible —
  // so a spot that's blurred for you (a stranger's public spot) shows as an area circle, never an exact point, and catches whose
  // spot you can't see at all are left out. One marker per spot, sized by how many fish; tap for the list. Filter by species.
  let biteOn = false, biteLayer = null, biteDays = 14, biteSpecies = "", bitePublic = null, bitePublicAt = 0, biteBusy = false;
  try { const d = +localStorage.getItem("fm-bite-days"); if ([3, 7, 14, 30].includes(d)) biteDays = d; } catch (e) { /* fine */ }
  const biteSince = () => Date.now() - biteDays * 86400000;
  const biteAgo = d => { const h = (Date.now() - new Date(d)) / 3600000; return h < 1 ? "just now" : h < 24 ? `${Math.round(h)} h ago` : h < 48 ? "yesterday" : `${Math.round(h / 24)} days ago`; };
  const biteKind = c => { const f = typeof seasonFor === "function" ? seasonFor(c.species) : null; return f ? f.name : cap((c.species || "Fish").trim()); };

  async function biteLoadPublic(force) {
    if (biteBusy || typeof db === "undefined" || !db || !me) return;
    if (!force && bitePublic && Date.now() - bitePublicAt < 10 * 60000) return;
    biteBusy = true;
    try {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data, error } = await db.from("catches").select("id,spot_id,species,how_many,length_in,weight_lb,weight_est,caught_at,created_by,caught_by,visibility")
        .eq("visibility", "public").is("deleted_at", null).gte("caught_at", since).order("caught_at", { ascending: false }).limit(300);
      if (error) throw error;
      bitePublic = data || []; bitePublicAt = Date.now();
      if (typeof ensureProfiles === "function") { try { await ensureProfiles(bitePublic.map(c => c.created_by)); } catch (e) { /* names are optional */ } }
    } catch (e) { if (!bitePublic) bitePublic = []; }
    biteBusy = false;
    if (biteOn) biteRender();
  }
  // every catch you can see from the last N days, each with the spot (and pin) it belongs to
  function biteCatches() {
    const since = biteSince(), seen = new Set(), out = [];
    const spotOf = id => (typeof spotsAll !== "undefined" && spotsAll.find(x => x.id === id)) || (spots || []).find(x => x.id === id);
    [...Object.values(catchesBySpot || {}).flat(), ...(bitePublic || [])].forEach(c => {
      if (!c || seen.has(c.id) || c.deleted_at || c.review_state === "blurred") return;
      if (!(new Date(c.caught_at) >= since)) return;
      const s = spotOf(c.spot_id);
      if (!s || s.lat == null || s.lng == null) return;      // you can't see where it was: leave it out
      seen.add(c.id); out.push({ c, s, kind: biteKind(c) });
    });
    return out;
  }
  function biteRender() {
    if (!map) return;
    if (!biteLayer) biteLayer = L.layerGroup();
    biteLayer.clearLayers();
    const all = biteCatches();
    biteChips(all);
    const list = biteSpecies ? all.filter(x => x.kind === biteSpecies) : all;
    const bySpot = new Map();
    list.forEach(x => { if (!bySpot.has(x.s.id)) bySpot.set(x.s.id, { s: x.s, rows: [] }); bySpot.get(x.s.id).rows.push(x); });
    bySpot.forEach(({ s, rows }) => {
      const n = rows.reduce((k, x) => k + (x.c.how_many || 1), 0), fresh = rows.some(x => Date.now() - new Date(x.c.caught_at) < 2 * 86400000);
      const kinds = [...new Set(rows.map(x => x.kind))];
      if (s.is_exact === false) L.circle([s.lat, s.lng], { radius: 400, color: "#e67e22", weight: 1, dashArray: "4 4", fillColor: "#e67e22", fillOpacity: 0.1, interactive: false }).addTo(biteLayer);
      L.circleMarker([s.lat, s.lng], {
        radius: Math.min(16, 7 + 2 * Math.sqrt(n)), weight: fresh ? 3 : 2, color: fresh ? "#ffffff" : "#fbe3cf", fillColor: "#e67e22", fillOpacity: 0.95,
        a11y: `${n} fish caught at ${s.name || "a spot"} in the last ${biteDays} days: ${kinds.join(", ")}${s.is_exact === false ? ", approximate area" : ""}`
      }).bindPopup(() => bitePopup(s, rows)).addTo(biteLayer);
    });
    const note = $("bite-note");
    if (note) {
      const total = list.reduce((k, x) => k + (x.c.how_many || 1), 0);
      note.hidden = false;
      note.textContent = !all.length ? `No catches you can see in the last ${biteDays} days.`
        : `🎣 ${total} fish at ${bySpot.size} spot${bySpot.size === 1 ? "" : "s"} in the last ${biteDays} days${biteSpecies ? " (" + biteSpecies + ")" : ""}. Bigger dot = more fish · white ring = last 2 days · dashed circle = approximate area.`;
    }
  }
  function bitePopup(s, rows) {
    const box = document.createElement("div");
    box.appendChild(el("div", "pop-name", "🎣 " + (s.name || "A spot")));
    box.appendChild(el("div", "pop-meta", `Last ${biteDays} days${s.is_exact === false ? " · approximate area (within about ¼ mile)" : ""}`));
    rows.slice().sort((a, b) => new Date(b.c.caught_at) - new Date(a.c.caught_at)).slice(0, 8).forEach(({ c, kind }) => {
      const who = isMine(c) ? "you" : (typeof profName === "function" && profName(c.created_by)) || c.caught_by || "someone";
      const size = [c.length_in > 0 ? +Number(c.length_in).toFixed(1) + "″" : null, c.weight_lb > 0 ? (c.weight_est ? "≈" : "") + lbText(Number(c.weight_lb)) : null].filter(Boolean).join(", ");
      const fresh = Date.now() - new Date(c.caught_at) < 2 * 86400000;
      const row = el("div", "bite-row");
      const b = el("button", "linkbtn", `${fresh ? "🆕 " : ""}${kind}${(c.how_many || 1) > 1 ? " ×" + c.how_many : ""}`); b.type = "button";
      b.title = "About " + kind; b.addEventListener("click", () => { if (typeof openSpecies === "function") openSpecies(kind); });
      row.appendChild(b);
      row.appendChild(el("span", "pop-meta", ` ${size ? size + " · " : ""}${who} · ${biteAgo(c.caught_at)}`));
      box.appendChild(row);
    });
    if (rows.length > 8) box.appendChild(el("div", "pop-meta", `+ ${rows.length - 8} more`));
    return box;
  }
  function biteChips(all) {
    const box = $("bite-chips"); if (!box) return;
    box.innerHTML = ""; box.hidden = !biteOn;
    const days = el("div", "fchips"); days.setAttribute("role", "radiogroup"); days.setAttribute("aria-label", "How far back");
    [3, 7, 14, 30].forEach(d => {
      const b = el("button", "fchip" + (biteDays === d ? " on" : ""), d === 3 ? "3 days" : d === 7 ? "Week" : d === 14 ? "2 weeks" : "Month"); b.type = "button";
      b.setAttribute("role", "radio"); b.setAttribute("aria-checked", biteDays === d ? "true" : "false");
      b.addEventListener("click", () => { biteDays = d; try { localStorage.setItem("fm-bite-days", d); } catch (e) { /* fine */ } biteRender(); });
      days.appendChild(b);
    });
    box.appendChild(days);
    const counts = new Map(); all.forEach(x => counts.set(x.kind, (counts.get(x.kind) || 0) + (x.c.how_many || 1)));
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (biteSpecies && !counts.has(biteSpecies)) top.push([biteSpecies, 0]);
    const sp = el("div", "fchips"); sp.setAttribute("role", "radiogroup"); sp.setAttribute("aria-label", "Which fish"); sp.style.marginTop = "6px";
    [["", "All fish", all.length ? all.reduce((k, x) => k + (x.c.how_many || 1), 0) : 0], ...top.map(([k, n]) => [k, k, n])].forEach(([k, t, n]) => {
      const on = biteSpecies === k;
      const b = el("button", "fchip" + (on ? " on" : ""), `${t}${n ? " (" + n + ")" : ""}`); b.type = "button";
      b.setAttribute("role", "radio"); b.setAttribute("aria-checked", on ? "true" : "false");
      b.addEventListener("click", () => { biteSpecies = k; biteRender(); });
      sp.appendChild(b);
    });
    box.appendChild(sp);
  }
  function setBiteOn(on) {
    biteOn = on;
    const btn = $("map-bite"); if (btn) btn.classList.toggle("on", on);
    $("bite-key").hidden = !on;
    if (!on) { $("bite-chips").hidden = true; $("bite-note").hidden = true; if (map && biteLayer) map.removeLayer(biteLayer); return; }
    if (!map) return;
    biteRender(); biteLayer.addTo(map);
    biteLoadPublic();
  }
  // redraw when the spots/catches are drawn again (renderPins calls this)
  function biteRefresh() { if (biteOn && map) biteRender(); }
  (function biteSetup() {
    const btn = $("map-bite"); if (!btn) return;
    btn.addEventListener("click", () => { initMap(); setBiteOn(!biteOn); });
    const sync = () => btn.setAttribute("aria-pressed", String(btn.classList.contains("on")));
    sync(); if (window.MutationObserver) new MutationObserver(sync).observe(btn, { attributes: true, attributeFilter: ["class"] });
  })();

  // ---- 👑 King of the spot (Fishbrain audit item 7): the longest fish and the strongest fish (Power) logged at each spot ----
  // From the catches you can see at that spot (yours + friends'). Shown on the spot's card in the list and in its map pop-up.
  function spotKing(s) {
    const cs = ((catchesBySpot || {})[s.id] || []).filter(c => !c.deleted_at && c.review_state !== "blurred" && c.species);
    if (!cs.length) return "";
    const who = c => isMine(c) ? "you" : (typeof profName === "function" && profName(c.created_by)) || c.caught_by || "a friend";
    const name = c => cap(c.species.trim());
    const big = cs.filter(c => c.length_in > 0).sort((a, b) => b.length_in - a.length_in || new Date(a.caught_at) - new Date(b.caught_at))[0]
      || cs.filter(c => c.weight_lb > 0 && !c.weight_est).sort((a, b) => b.weight_lb - a.weight_lb)[0];
    const strong = typeof rankOf === "function" ? cs.map(c => ({ c, rk: rankOf(c) })).filter(x => x.rk).sort((a, b) => b.rk.power - a.rk.power)[0] : null;
    const size = c => c.length_in > 0 ? +Number(c.length_in).toFixed(1) + "″" : lbText(Number(c.weight_lb));
    if (big && strong && strong.c === big) return `👑 King of the spot: ${size(big)} ${name(big)} by ${who(big)} · ${strong.rk.icon} Power ${strong.rk.power}`;
    const parts = [];
    if (big) parts.push(`👑 Biggest: ${size(big)} ${name(big)} by ${who(big)}`);
    if (strong) parts.push(`${strong.rk.icon} Strongest: ${name(strong.c)} (Power ${strong.rk.power}) by ${who(strong.c)}`);
    return parts.join(" · ");
  }
