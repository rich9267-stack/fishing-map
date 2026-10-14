  // ---- 🐟 Species pages: one page per kind of fish, built from what the app already knows ----
  // Seasons research (bite months, spawning, water temp, rule, tip) · the keeper rule (fish_rules) · our group's catches
  // (count, best tide / time / bait / spots, biggest fish, best Power) · race stats (FISH_RANK_TABLE) · iNaturalist sightings nearby.
  // Opened from a fish name in Seasons, from a card in 🐟 My fish, and from openSpecies(name) anywhere. Nothing new is stored.
  let spOpenFrom = null;
  const spMatch = (f, name) => c => c.species && (f ? seasonFor(c.species) === f : cap(c.species.trim()).toLowerCase() === String(name).toLowerCase());
  function spTop(list, key, n) {
    const m = new Map();
    list.forEach(c => { const k = key(c); if (k) m.set(k, (m.get(k) || 0) + (c.how_many || 1)); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n || 3);
  }
  const spWho = c => isMine(c) ? "you" : (typeof profName === "function" && profName(c.created_by)) || "a friend";

  function openSpecies(name) {
    const f = (typeof SEASONS !== "undefined" && (SEASONS.find(x => x.name.toLowerCase() === String(name).toLowerCase()) || seasonFor(name))) || null;
    const title = f ? f.name : cap(String(name || "").trim());
    if (!title) return;
    spClose();
    spOpenFrom = document.activeElement;
    const sheet = el("div", "sp-sheet"); sheet.id = "sp-sheet";
    sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-modal", "true"); sheet.setAttribute("aria-label", title);
    const inner = el("div", "sp-inner"); sheet.appendChild(inner);
    // header
    const head = el("div", "sp-head");
    const close = el("button", "btn ghost small", "✕ Close"); close.type = "button"; close.addEventListener("click", spClose);
    head.appendChild(close);
    inner.appendChild(head);
    const hero = el("div", "sp-hero");
    hero.appendChild(fishSvg(title, 120));
    const ht = el("div");
    ht.appendChild(el("h2", "sp-title", title));
    const groupName = f && (SEASON_GROUPS.find(g => g[0] === f.group) || [])[1];
    ht.appendChild(el("div", "spot-meta", [groupName, f && f.far ? "📍 Not in S. Florida" : null].filter(Boolean).join(" · ")));
    hero.appendChild(ht);
    inner.appendChild(hero);
    const section = (label) => { const s = el("div", "sp-sec"); s.appendChild(el("div", "label", label)); inner.appendChild(s); return s; };

    // 📅 this month & the year
    if (f) {
      const s = section("📅 When to catch it");
      const m = new Date().getMonth();
      if (f.far) s.appendChild(el("div", null, "📍 Lives in: " + f.far));
      else {
        const lvl = f.shore[m];
        s.appendChild(el("div", null, `${MONTHS[m]}: ${["slow", "good", "🔥 peak"][lvl]} from shore${f.boat[m] !== lvl ? `, ${["slow", "good", "🔥 peak"][f.boat[m]]} by boat` : ""}.`));
        const months = el("div", "sea-months sp-months");
        MONTHS.forEach((mm, i) => { const x = el("span", f.shore[i] ? "l" + f.shore[i] : "", mm[0]); if (spawningIn(f, i)) x.classList.add("egg"); if (i === m) x.classList.add("cur"); x.title = `${mm}: ${["slow", "good", "peak"][f.shore[i]]}`; months.appendChild(x); });
        s.appendChild(months);
        const best = MONTHS.filter((mm, i) => f.shore[i] === 2);
        if (best.length) s.appendChild(el("div", "spot-meta", "Best months from shore: " + best.join(", ")));
      }
      const sp = spawnText(f, m); if (sp) s.appendChild(el("div", "spot-meta", sp));
      if (f.temp) s.appendChild(el("div", "spot-meta", `🌡 Likes ${f.temp.low}–${f.temp.high}°F water; slows down below ~${f.temp.cold}°F.`));
    }

    // 📏 rules
    const r = typeof ruleFor === "function" ? ruleFor(title) : null;
    if (f || r) {
      const s = section("📏 Rules");
      if (r) {
        if (r.release_only) s.appendChild(el("div", "keeper bad", "🚫 Catch-and-release only."));
        else {
          const lenName = r.measure === "fork" ? "fork length" : "total length";
          const size = r.min_in != null && r.max_in != null ? `${inch(r.min_in)}–${inch(r.max_in)} ${lenName}` : r.min_in != null ? `${inch(r.min_in)} minimum (${lenName})` : r.max_in != null ? `${inch(r.max_in)} maximum (${lenName})` : "";
          const closed = seasonState(r, new Date()) === "closed";
          s.appendChild(el("div", "keeper " + (closed ? "bad" : "ok"), `${closed ? "🚫 Out of season right now — release it." : "✅ Open to keep today."}${size ? " Size: " + size + "." : ""}${r.bag ? " Bag: " + r.bag + "." : ""}`));
          if (r.note) s.appendChild(el("div", "spot-meta", r.note));
        }
        s.appendChild(el("div", "spot-meta", ruleStale(r) ? `⚠️ Last checked ${ruleAge(r) == null ? "a while ago" : ruleAge(r) + " days ago"} — confirm with FWC.` : `Checked ${r.verified_on}. Always confirm with FWC.`));
      } else s.appendChild(el("div", null, f.rule));
      if (f && f.tip) { const t = el("div", "sea-rule", "💡 " + f.tip); s.appendChild(t); }
    }

    // 🎣 from our catches
    const all = Object.values(catchesBySpot || {}).flat().filter(c => !c.deleted_at).filter(spMatch(f, title));
    const s3 = section("🎣 In our catches");
    const total = all.reduce((n, c) => n + (c.how_many || 1), 0), mine = all.filter(isMine).reduce((n, c) => n + (c.how_many || 1), 0);
    if (!all.length) s3.appendChild(el("div", "spot-meta", "Nobody in your group has logged one yet. Be the first!"));
    else {
      s3.appendChild(el("div", null, `${total} logged — ${mine} by you, ${total - mine} by friends you can see.`));
      const lines = [];
      const tide = spTop(all.filter(c => c.tide_stage), c => cap(c.tide_stage), 1)[0];
      const tod = spTop(all, c => timeOfDay(new Date(c.caught_at)), 1)[0];
      const baits = spTop(all, c => c.bait && cap(c.bait.trim().toLowerCase()), 3);
      const where = spTop(all, c => { const sp = (spots || []).find(x => x.id === c.spot_id); return sp ? sp.name : null; }, 3);
      const temps = all.map(c => +c.water_temp_f).filter(t => t > 0);
      if (all.length >= 3) {
        if (tide) lines.push(`🌊 Most on: ${tide[0].toLowerCase()} tide (${tide[1]})`);
        if (tod) lines.push(`🕒 Most at: ${tod[0]} (${tod[1]})`);
      }
      if (baits.length) lines.push(`🪱 Baits: ${baits.map(([b, n]) => `${b} (${n})`).join(", ")}`);
      if (where.length) lines.push(`📍 Spots: ${where.map(([b, n]) => `${b} (${n})`).join(", ")}`);
      if (temps.length >= 3) { const lo = Math.round(Math.min(...temps)), hi = Math.round(Math.max(...temps)); lines.push(`🌡 Caught in ${lo === hi ? lo : lo + "–" + hi}°F water`); }
      const ul = el("ul", "sp-list"); lines.forEach(t => ul.appendChild(el("li", null, t))); s3.appendChild(ul);
      if (all.length < 5) s3.appendChild(el("div", "spot-meta", "Only a few so far — these patterns firm up after about 20."));
      // biggest
      const longest = all.filter(c => c.length_in > 0).sort((a, b) => b.length_in - a.length_in)[0];
      const heaviest = all.filter(c => c.weight_lb > 0 && !c.weight_est).sort((a, b) => b.weight_lb - a.weight_lb)[0];
      const ranked = all.map(c => ({ c, rk: rankOf(c) })).filter(x => x.rk).sort((a, b) => b.rk.power - a.rk.power)[0];
      const big = [];
      if (longest) big.push(`📏 Longest: ${+Number(longest.length_in).toFixed(1)}″ by ${spWho(longest)} (${recDate(longest)})`);
      if (heaviest) big.push(`⚖️ Heaviest: ${lbText(Number(heaviest.weight_lb))} by ${spWho(heaviest)} (${recDate(heaviest)})`);
      if (ranked) big.push(`${ranked.rk.icon} Strongest: Power ${ranked.rk.power} (${ranked.rk.tier}) by ${spWho(ranked.c)}`);
      if (big.length) { const ub = el("ul", "sp-list"); big.forEach(t => ub.appendChild(el("li", null, t))); s3.appendChild(ub); }
      const myBest = all.filter(isMine).map(c => ({ c, rk: rankOf(c) })).filter(x => x.rk).sort((a, b) => b.rk.power - a.rk.power)[0];
      if (myBest && ranked && myBest.c !== ranked.c) s3.appendChild(el("div", "spot-meta", `Your best: Power ${myBest.rk.power} (${recSize(myBest.c)})`));
    }

    // 🏁 race stats
    const e = typeof rankEntry === "function" ? rankEntry(title) || (f && f.match.map(rankEntry).find(Boolean)) : null;
    if (e) {
      const s = section("🏁 Fish race");
      const at = k => fishRank({ species: e[0][0], length_in: e[1] * k }, true);
      const typ = at(0.8), big = at(1.0);
      s.appendChild(el("div", null, `A big one is about ${e[1]}″. Rarity ${"★".repeat(e[2])}${"☆".repeat(5 - e[2])}.`));
      if (typ && typeof raceClass === "function") {
        const c1 = raceClass(typ.stats.speed, typ.stats.stamina), c2 = raceClass(big.stats.speed, big.stats.stamina);
        s.appendChild(el("div", "spot-meta", `A typical one (${Math.round(e[1] * 0.8)}″): Power ${typ.power} · 💪 ${typ.stats.strength} · ⚡ ${typ.stats.speed} · ❤️ ${typ.stats.stamina} · races in ${classTag(c1)}${c2 !== c1 ? ` (a big one: ${classTag(c2)})` : ""}.`));
      }
    }

    // 👀 sightings
    if (f && typeof sightCountFor === "function") {
      const n = sightCountFor(f);
      if (n) { const s = section("👀 Seen nearby"); s.appendChild(el("div", null, `${n} public photo${n === 1 ? "" : "s"} near your spots in the last ${SIGHT_DAYS} days (iNaturalist).`)); }
    }

    // actions
    const bar = el("div", "sp-actions");
    if (all.length) {
      const ch = el("button", "btn ghost", "📊 All charts for this fish"); ch.type = "button";
      ch.addEventListener("click", () => {
        spClose(); if (typeof statsOpen === "function") statsOpen("insights"); else showView("insights");
        const sel = $("ins-species"); if (!sel) return;
        if (typeof fillInsightPickers === "function") fillInsightPickers();
        const opt = [...sel.options].find(o => o.value && spMatch(f, title)({ species: o.value }));
        if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event("change")); }
        setTimeout(() => { const c = $("ins-charts"); if (c && c.scrollIntoView) c.scrollIntoView({ behavior: "smooth", block: "start" }); }, 150);
      });
      bar.appendChild(ch);
    }
    const log = el("button", "btn", "➕ Log one"); log.type = "button";
    log.addEventListener("click", () => { spClose(); const fab = $("qc-fab"); if (fab) fab.click(); });
    bar.appendChild(log);
    inner.appendChild(bar);

    document.body.appendChild(sheet);
    document.body.classList.add("sp-open");
    close.focus();
  }
  function spClose() {
    const s = $("sp-sheet"); if (!s) return;
    s.remove(); document.body.classList.remove("sp-open");
    if (spOpenFrom && document.body.contains(spOpenFrom) && spOpenFrom.focus) spOpenFrom.focus();
    spOpenFrom = null;
  }
  document.addEventListener("keydown", e => { if (e.key === "Escape" && $("sp-sheet")) spClose(); });
