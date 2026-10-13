  // ---- 🏅 Fish rank (Power, tier and stats for each caught fish — the base for fish-vs-fish minigames) ----
  // A fish's rank comes only from facts about the fish: its species and how big it is compared with a big adult of that species.
  // Only catches with a photo count (callers pass hasPhoto). Same numbers for everyone, so players can be compared fairly.
  // [name words, "big adult" length in inches, rarity 1–5, base power, base speed, base stamina (1–10)]
  const FISH_RANK_TABLE = [
    [["snook"], 34, 3, 7, 7, 6], [["tarpon"], 72, 5, 10, 8, 10], [["redfish", "red drum"], 33, 3, 6, 5, 7], [["seatrout", "speckled trout", "trout"], 24, 2, 4, 5, 4],
    [["crevalle", "jack"], 36, 3, 8, 9, 9], [["mangrove", "gray snapper"], 20, 2, 5, 5, 5], [["mutton"], 30, 4, 7, 6, 6], [["yellowtail"], 20, 3, 4, 7, 5],
    [["lane snapper"], 14, 1, 2, 4, 3], [["red snapper"], 30, 4, 7, 5, 7], [["pompano"], 18, 3, 4, 8, 5], [["permit"], 36, 5, 8, 9, 8],
    [["spanish"], 24, 2, 4, 9, 4], [["bluefish"], 24, 2, 5, 7, 5], [["sheepshead"], 22, 2, 5, 3, 6], [["whiting", "kingcroaker"], 16, 1, 2, 3, 3],
    [["kingfish", "king mackerel"], 48, 4, 8, 10, 6], [["mahi", "dolphin"], 48, 4, 7, 10, 6], [["wahoo"], 66, 5, 8, 10, 6], [["black grouper"], 48, 5, 9, 3, 9],
    [["red grouper"], 30, 3, 7, 3, 8], [["gag"], 38, 4, 8, 3, 8], [["goliath"], 72, 5, 10, 3, 10], [["barracuda"], 52, 4, 8, 9, 6],
    [["cobia"], 50, 5, 9, 6, 9], [["ladyfish"], 22, 1, 2, 8, 3], [["black drum"], 40, 3, 8, 3, 8], [["largemouth"], 24, 3, 6, 5, 6],
    [["peacock"], 24, 4, 6, 8, 6], [["snakehead"], 36, 4, 7, 5, 8], [["bluegill", "panfish", "shellcracker"], 11, 1, 1, 3, 2], [["mayan", "cichlid"], 13, 2, 3, 4, 3],
    [["mullet"], 20, 1, 2, 6, 3], [["tripletail"], 30, 4, 5, 3, 5], [["flounder"], 24, 3, 4, 3, 4], [["hogfish"], 26, 4, 5, 4, 5],
    [["amberjack"], 50, 5, 10, 8, 10], [["spadefish"], 20, 2, 4, 4, 5], [["blue runner", "hardtail"], 20, 1, 3, 7, 4],
    [["little tunny", "bonito", "false albacore"], 32, 3, 6, 10, 7], [["pinfish"], 9, 1, 1, 3, 1], [["hardhead", "gafftopsail"], 20, 1, 3, 2, 3],
    [["crappie", "speckled perch"], 15, 1, 2, 3, 2], [["channel catfish"], 32, 2, 5, 2, 6], [["florida gar", "longnose gar", "spotted gar"], 40, 3, 5, 4, 5],
    [["oscar"], 14, 2, 3, 4, 3], [["tilapia"], 16, 1, 2, 3, 3]
  ];
  const RANK_TIERS = [[900, "Legendary", "🌟"], [650, "Epic", "💜"], [400, "Rare", "💙"], [200, "Uncommon", "💚"], [0, "Common", "⚪"]];
  function rankEntry(species) {
    const sp = String(species || "").toLowerCase();
    // longest matching word wins ("red snapper" before "snapper"), like the weight table
    let best = null, bl = 0;
    FISH_RANK_TABLE.forEach(r => r[0].forEach(w => { if (w.length > bl && sp.includes(w)) { best = r; bl = w.length; } }));
    return best;
  }
  // Length to rank by: the measured length, else (for a real, not estimated, weight) the length that weight implies.
  function rankLength(c) {
    if (c.length_in > 0) return +c.length_in;
    if (c.weight_lb > 0 && !c.weight_est) {
      const w = weightRef(c.species);
      if (w) return w[1] * Math.pow(c.weight_lb / w[2], 1 / 3);
    }
    return null;
  }
  // Returns null when a fish can't be ranked (no photo, no size, or a species we have no table row for).
  function fishRank(c, hasPhoto) {
    if (!c || !hasPhoto) return null;
    const e = rankEntry(c.species), L = rankLength(c);
    if (!e || !(L > 0)) return null;
    const r = Math.min(L / e[1], 1.3);                       // 1.0 = a big adult of this species
    const sf = 0.15 + 0.85 * ((e[3] + e[4] + e[5]) / 30 * 0.6 + e[2] / 5 * 0.4);   // species strength: tough, fast, rare fish start higher
    const power = Math.round(40 + 900 * Math.pow(r, 1.7) * sf);
    const stat = base => Math.min(100, Math.round(base * 10 * (0.5 + 0.6 * Math.min(r, 1.1))));
    const tier = RANK_TIERS.find(t => power >= t[0]);
    return { power, tier: tier[1], icon: tier[2], rarity: e[2], size: Math.round(r * 100),
      stats: { strength: stat(e[3]), speed: stat(e[4]), stamina: stat(e[5]) } };
  }
  const rankLine = rk => rk ? `${rk.icon} ${rk.tier} · Power ${rk.power}` : "";
  function catchHasPhoto(c) {
    return (photosBySpot[c.spot_id] || []).some(p => p.catch_id === c.id);
  }

  // ---- Show rank anywhere a fish is shown. A catch counts only when it has a photo; photos of other people's catches are looked up
  // in the background (one small query), and the screens redraw themselves when an answer comes back. ----
  const rankPhoto = new Map();           // catch id -> true/false once we know
  const rankPending = new Set();         // ids waiting for the next lookup
  let rankTimer = null;
  function rankHasPhoto(c) {
    if (!c || !c.id) return false;
    if (catchHasPhoto(c)) return true;
    if (rankPhoto.has(c.id)) return rankPhoto.get(c.id);
    if (typeof db !== "undefined" && db) { rankPending.add(c.id); if (!rankTimer) rankTimer = setTimeout(rankFlush, 300); }
    return false;
  }
  async function rankWarm(ids) {         // look up which of these catches have photos; returns how many turned out to have one
    ids = [...new Set(ids)].filter(id => id && !rankPhoto.has(id));
    let found = 0;
    for (let i = 0; i < ids.length; i += 150) {
      const chunk = ids.slice(i, i + 150);
      try {
        const { data, error } = await db.from("photos").select("catch_id").in("catch_id", chunk);
        if (error) throw error;
        const has = new Set((data || []).map(p => p.catch_id));
        chunk.forEach(id => { rankPhoto.set(id, has.has(id)); if (has.has(id)) found++; });
      } catch (e) { chunk.forEach(id => rankPhoto.set(id, false)); }   // offline: show no rank rather than keep asking
    }
    return found;
  }
  async function rankFlush() {
    rankTimer = null;
    const ids = [...rankPending]; rankPending.clear();
    if (ids.length && await rankWarm(ids)) rankRedraw();
  }
  function rankRedraw() {
    const tryIt = f => { try { f(); } catch (e) { /* that screen isn't ready — fine */ } };
    if (typeof renderSpots === "function") tryIt(renderSpots);
    if (typeof feedRefresh === "function") tryIt(feedRefresh);
    if (typeof renderRecords === "function") tryIt(renderRecords);
  }
  const rankOf = c => fishRank(c, rankHasPhoto(c));
  function rankTag(c) { const rk = rankOf(c); return rk ? ` · ${rk.icon} ${rk.power}` : ""; }
  function rankBlock(rk) {
    const b = document.createElement("div"); b.className = "rank-block";
    const t = document.createElement("div"); t.className = "rank-t"; t.textContent = rankLine(rk); b.appendChild(t);
    const s = document.createElement("div"); s.className = "spot-meta";
    s.textContent = `💪 Strength ${rk.stats.strength} · ⚡ Speed ${rk.stats.speed} · ❤️ Stamina ${rk.stats.stamina}`; b.appendChild(s);
    return b;
  }
  // Add the rank card to a details box; looks up the photo first if needed. `stillShowing` stops a late answer landing on another fish.
  function rankFill(box, c, stillShowing) {
    const put = () => {
      if (stillShowing && !stillShowing()) return;
      const rk = fishRank(c, rankPhoto.get(c.id) === true || catchHasPhoto(c));
      if (rk) box.appendChild(rankBlock(rk));
      else if (rankLength(c) > 0 && rankEntry(c.species) && me && c.created_by === me.id) { const n = document.createElement("div"); n.className = "spot-meta"; n.textContent = "📷 Add a photo of this fish to give it a rank."; box.appendChild(n); }
    };
    if (catchHasPhoto(c) || rankPhoto.has(c.id) || typeof db === "undefined" || !db) put();
    else rankWarm([c.id]).then(put);
  }
