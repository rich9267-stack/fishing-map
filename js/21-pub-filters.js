  // ---- 🌎 Public feed: 📍 Local / 🌎 Global switch + the same filters for both (Fishbrain audit item 10) ----
  // Local = public catches whose spot is within 25 miles of where you are right now (phone location; a stranger's spot
  // uses its approximate pin, which is close enough). Catches whose spot is hidden from you only show in Global.
  // Filters: time (24 h / 7 days / 30 days / all), fish, water (salt / brackish / fresh), photos only, ranked only. Newest first.
  // The time limit is asked of the database; the rest is worked out on the phone from up to 200 recent public catches.
  const PUB_LOCAL_MI = 25;
  let pubF = { scope: "global", days: 7, kind: "", water: "", photo: false, ranked: false };
  try { const s = JSON.parse(localStorage.getItem("fm-pub-filters") || "null"); if (s && typeof s === "object") pubF = Object.assign(pubF, s); } catch (e) { /* fine */ }
  let pubPos = null, pubPosAt = 0, pubPosErr = "", pubPosBusy = false;
  const pubSave = () => { try { localStorage.setItem("fm-pub-filters", JSON.stringify(pubF)); } catch (e) { /* fine */ } };
  const pubSinceIso = () => pubF.days ? new Date(Date.now() - pubF.days * 86400000).toISOString() : null;
  const pubKind = c => { const f = typeof seasonFor === "function" ? seasonFor(c.species) : null; return f ? f.name : cap((c.species || "Fish").trim()); };
  const pubSpot = c => (typeof spotsAll !== "undefined" ? spotsAll : []).find(x => x.id === c.spot_id) || (spots || []).find(x => x.id === c.spot_id);
  const pubHasPhoto = c => ((pubPhotos[c.id] || []).length > 0);

  function pubLocate() {
    if (pubPosBusy) return;
    if (pubPos && Date.now() - pubPosAt < 10 * 60000) return;
    if (!navigator.geolocation) { pubPosErr = "This phone can't share its location."; return; }
    pubPosBusy = true; pubPosErr = "";
    navigator.geolocation.getCurrentPosition(p => {
      pubPos = { lat: p.coords.latitude, lng: p.coords.longitude }; pubPosAt = Date.now(); pubPosBusy = false;
      if (typeof renderPublic === "function") renderPublic();
    }, () => {
      pubPosBusy = false; pubPosErr = "Couldn't get your location — allow location for this site (or switch to 🌎 Global).";
      if (typeof renderPublic === "function") renderPublic();
    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
  }
  // which of the loaded public catches to show
  function pubFilter(list) {
    return list.filter(c => {
      if (c.review_state === "blurred") return false;
      const since = pubSinceIso(); if (since && !(c.caught_at >= since)) return false;   // the database already did this; kept for cached lists
      if (pubF.scope === "local") {
        const s = pubSpot(c);
        if (!pubPos || !s || s.lat == null || s.lng == null || miles(pubPos.lat, pubPos.lng, s.lat, s.lng) > PUB_LOCAL_MI) return false;
      }
      if (pubF.kind && pubKind(c) !== pubF.kind) return false;
      if (pubF.water) { const s = pubSpot(c); if (!s || s.water_type !== pubF.water) return false; }
      if (pubF.photo && !pubHasPhoto(c)) return false;
      if (pubF.ranked && !(typeof rankOf === "function" && rankOf(c, pubHasPhoto(c)))) return false;
      return true;
    });
  }
  function pubFilterBar(all) {
    const bar = el("div", "pub-filters");
    const chips = (label, opts, cur, set) => {
      const g = el("div", "fchips"); g.setAttribute("role", "radiogroup"); g.setAttribute("aria-label", label);
      opts.forEach(([v, t]) => {
        const on = cur === v, b = el("button", "fchip" + (on ? " on" : ""), t); b.type = "button";
        b.setAttribute("role", "radio"); b.setAttribute("aria-checked", on ? "true" : "false");
        b.addEventListener("click", () => { set(v); pubSave(); pubShown = 30; if (label === "How far back") loadPublic(); else renderPublic(); });
        g.appendChild(b);
      });
      bar.appendChild(g);
    };
    chips("Which feed", [["local", "📍 Local"], ["global", "🌎 Global"]], pubF.scope, v => { pubF.scope = v; if (v === "local") pubLocate(); });
    chips("How far back", [[1, "24 h"], [7, "7 days"], [30, "30 days"], [0, "All"]], pubF.days, v => { pubF.days = v; });
    // fish: the kinds in what's loaded (most common first), plus the one picked
    const counts = new Map(); all.forEach(c => { const k = pubKind(c); counts.set(k, (counts.get(k) || 0) + 1); });
    const kinds = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k]) => k);
    if (pubF.kind && !kinds.includes(pubF.kind)) kinds.push(pubF.kind);
    chips("Which fish", [["", "All fish"], ...kinds.map(k => [k, k])], pubF.kind, v => { pubF.kind = v; });
    chips("Water", [["", "All water"], ["saltwater", "Salt"], ["brackish", "Brackish"], ["freshwater", "Fresh"]], pubF.water, v => { pubF.water = v; });
    const tog = el("div", "fchips");
    [["photo", "📷 Photos only"], ["ranked", "🏅 Ranked only"]].forEach(([k, t]) => {
      const on = !!pubF[k], b = el("button", "fchip" + (on ? " on" : ""), t); b.type = "button"; b.setAttribute("aria-pressed", on ? "true" : "false");
      b.addEventListener("click", () => { pubF[k] = !pubF[k]; pubSave(); pubShown = 30; renderPublic(); });
      tog.appendChild(b);
    });
    bar.appendChild(tog);
    const on = (pubF.kind ? 1 : 0) + (pubF.water ? 1 : 0) + (pubF.photo ? 1 : 0) + (pubF.ranked ? 1 : 0);
    if (on) {
      const clr = el("button", "linkbtn", "✕ Clear filters"); clr.type = "button";
      clr.addEventListener("click", () => { pubF.kind = ""; pubF.water = ""; pubF.photo = false; pubF.ranked = false; pubSave(); renderPublic(); });
      bar.appendChild(clr);
    }
    return bar;
  }
  // a line under the filters: how many, where from
  function pubSummary(n) {
    const when = pubF.days === 1 ? "the last 24 hours" : pubF.days ? `the last ${pubF.days} days` : "all time";
    if (pubF.scope === "local") {
      if (!pubPos) return pubPosErr || "📍 Finding where you are…";
      return `📍 ${n} public catch${n === 1 ? "" : "es"} within ${PUB_LOCAL_MI} miles of you, ${when}.`;
    }
    return `🌎 ${n} public catch${n === 1 ? "" : "es"}, ${when}.`;
  }
