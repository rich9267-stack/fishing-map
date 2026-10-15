  // ---- 🗺 Regional fishing rules (Gulf expansion, step 6) ----
  // FWC rules differ by coast, so each row of fish_rules (js/10) can carry `regions` tags; no tags = the whole state.
  //   atlantic · keys (Monroe County) · gulf · spz (Special Permit Zone: south of Cape Florida + the Keys)
  //   sw (Gulf-side Southwest: Collier south of Vanderbilt Beach Rd, plus Monroe) · ch (Charlotte Harbor) · bigbend (Franklin to Pasco counties)
  // regionInfo(lat, lng) says which tags fit a place, best match first (e.g. Marathon = keys, spz, atlantic). Rough lines, not survey lines:
  // they only decide which written rule to show, and every rule still says "confirm with FWC".
  const RG_KEY = "fm-rules-region";
  const RG_PICKS = [   // the chips on the Seasons tab: "auto" follows where you are, the rest show another coast's rules
    { k: "auto", label: "📍 Where I am" },
    { k: "atlantic", label: "🌴 Atlantic coast", lat: 26.24, lng: -80.10 },
    { k: "keys", label: "🏝 Florida Keys", lat: 24.85, lng: -80.80 },
    { k: "sw", label: "🌊 Gulf · Naples / Everglades", lat: 26.14, lng: -81.80 },
    { k: "ch", label: "🌊 Gulf · Fort Myers / Charlotte Harbor", lat: 26.55, lng: -82.00 },
    { k: "tb", label: "🌊 Gulf · Sarasota / Tampa Bay", lat: 27.70, lng: -82.65 },
    { k: "bb", label: "🌊 Gulf · Big Bend", lat: 29.14, lng: -83.03 }
  ];
  let rgPick = "auto";
  try { const v = localStorage.getItem(RG_KEY); if (v && RG_PICKS.some(p => p.k === v)) rgPick = v; } catch (e) {}

  function regionInfo(lat, lng) {
    lat = +lat; lng = +lng;
    if (!isFinite(lat) || !isFinite(lng)) { lat = 26.24; lng = -80.10; }
    if (lat < 24.3 || lat > 31.1 || lng < -87.7 || lng > -79.8) return { tags: ["atlantic"], label: "Outside Florida", outside: true };
    const keys = (lat < 25.32 && lng < -80.1) || (lat < 25.75 && lng < -80.75 && lng > -81.4);   // Monroe County: the Keys, Florida Bay, Cape Sable
    if (keys) return { tags: ["keys", "spz", "atlantic"], label: "Florida Keys (Monroe County)" };
    if (lng <= -81.2) {                                                                          // Gulf coast
      if (lat < 26.254) return { tags: ["sw", "gulf"], label: "Gulf coast · Southwest (Naples to Everglades)" };
      if (lat < 27.079) return { tags: ["ch", "gulf"], label: "Gulf coast · Charlotte Harbor / Fort Myers" };
      if (lat >= 28.15) return { tags: ["bigbend", "gulf"], label: "Gulf coast · Big Bend" };
      return { tags: ["gulf"], label: "Gulf coast · Sarasota / Tampa Bay" };
    }
    if (lat < 25.667) return { tags: ["spz", "atlantic"], label: "Atlantic coast · south of Cape Florida" };
    if (lat > 26.97) return { tags: ["atlantic"], label: "Atlantic coast · north of Palm Beach County", north: true };
    return { tags: ["atlantic"], label: "Atlantic coast (Southeast Florida)" };
  }
  // The place whose rules are on screen: the coast picked on the Seasons tab, else where you are now (js/29), else home
  function rulesInfo() {
    const p = rgPick !== "auto" ? RG_PICKS.find(x => x.k === rgPick) : null;
    if (p) return regionInfo(p.lat, p.lng);
    const a = typeof area !== "undefined" ? area : null;
    return regionInfo(a ? a.lat : LAT, a ? a.lng : LNG);
  }
  // The place of a spot or a GPS fix (anything with lat / lng); falls back to rulesInfo() when it has no position
  function rulesInfoFor(p) { return p && p.lat != null && p.lng != null ? regionInfo(p.lat, p.lng) : rulesInfo(); }

  // Seasons cards: closed dates and the 📏 line come from fish_rules for the place on screen; the card's own text is the fallback.
  function ruleForCard(f) {
    const words = (f.match || []).map(w => String(w).toLowerCase());
    const rows = (typeof fishRules !== "undefined" ? fishRules : []).filter(r => (r.match || []).some(w => words.includes(String(w).toLowerCase())));
    if (!rows.length) return null;
    const info = rulesInfo();
    return [...new Set(rows.map(r => r.species))].map(sp => pickRegionRow(rows.filter(r => r.species === sp), info));
  }
  function seasonView(f) {
    const picks = ruleForCard(f);
    if (!picks || !picks.length) return f;
    const sig = r => JSON.stringify([r.closed || null, r.open_only || null]);
    const v = Object.assign({}, f);
    if (picks.every(r => sig(r) === sig(picks[0]))) {   // several fish on one card (the groupers) only override when they agree
      const r = picks[0];
      v.closed = Array.isArray(r.closed) && r.closed.length ? r.closed : undefined;
      v.openOnly = Array.isArray(r.open_only) && r.open_only.length ? r.open_only : undefined;
    }
    v.rule = picks.length === 1 ? ruleLine(picks[0]) : picks.map(r => `${r.species}: ${ruleSummaryShort(r)}`).join(" — ");
    v.ruleRow = picks.length === 1 ? picks[0] : null;
    return v;
  }
  function ruleSummaryShort(r) {
    if (r.release_only) return "catch-and-release only";
    return [r.min_in != null ? inch(r.min_in) + " min" : "", r.max_in != null ? inch(r.max_in) + " max" : "", r.bag].filter(Boolean).join(", ") || "no size limit";
  }

  // The chips under the month on the Seasons tab
  function rulesCautions(info) {
    const out = [];
    if (info.outside) out.push("This place is outside Florida — these are Florida's rules.");
    if (info.north) out.push("North of Palm Beach County some FWC rules differ (Indian River Lagoon, Northeast); the South Florida rules are shown.");
    if (info.tags[0] === "keys") out.push("In the Keys a few rules depend on which side you fish (Atlantic or Gulf / Florida Bay).");
    return out;
  }
  function renderRulesRegionBar() {
    const bar = $("sea-region"), note = $("sea-region-note"); if (!bar) return;
    bar.innerHTML = "";
    RG_PICKS.forEach(p => {
      const b = document.createElement("button"); b.type = "button"; b.textContent = p.label;
      b.classList.toggle("on", rgPick === p.k); b.setAttribute("aria-pressed", rgPick === p.k ? "true" : "false");
      b.addEventListener("click", () => setRulesPick(p.k));
      bar.appendChild(b);
    });
    const info = rulesInfo();
    if (note) note.textContent = `${rgPick === "auto" ? "Following where you are: " : "Showing: "}${info.label}. ${rulesCautions(info).join(" ")} Always confirm with FWC.`.replace(/\s+/g, " ");
  }
  function setRulesPick(k) {
    if (!RG_PICKS.some(p => p.k === k)) return;
    rgPick = k;
    try { localStorage.setItem(RG_KEY, k); } catch (e) {}
    if (typeof renderSeasons === "function") renderSeasons();
  }
  // js/29 calls this when the area now changes; only matters while "Where I am" is selected
  function rulesAreaChanged() { if (rgPick === "auto" && typeof renderSeasons === "function") renderSeasons(); }
