  // ---- 🌎 Public feed: 📍 Local / 🏠 Home / 🌎 Global switch + the same filters for all (Fishbrain audit item 10; Gulf expansion step 1b) ----
  // Local = public catches whose spot is within 25 miles of the "area now" (js/29: where your phone is if you allowed location,
  // otherwise your home waters; a stranger's spot uses its approximate pin, which is close enough).
  // Home = the same, but around your HOME waters. The 🏠 Home chip only appears while you are away from home (area.away).
  // Global = everywhere. Catches whose spot is hidden from you only show in Global.
  // Filters: time (24 h / 7 days / 30 days / all), fish, water (salt / brackish / fresh), photos only, ranked only. Newest first.
  // The time limit is asked of the database; the rest is worked out on the phone from up to 200 recent public catches.
  const PUB_LOCAL_MI = 25;
  let pubF = { scope: "global", days: 7, kind: "", water: "", photo: false, ranked: false };
  try { const s = JSON.parse(localStorage.getItem("fm-pub-filters") || "null"); if (s && typeof s === "object") pubF = Object.assign(pubF, s); } catch (e) { /* fine */ }
  // The feed that is really showing: a saved 🏠 Home choice quietly becomes 📍 Local once you are back home
  const pubAway = () => typeof area !== "undefined" && !!area.away;
  const pubScope = () => (pubF.scope === "home" && !pubAway()) ? "local" : pubF.scope;
  // The point Local / Home are measured from
  function pubCenter() {
    if (pubScope() === "home") { const h = hwHome(); return { lat: h.lat, lng: h.lng, name: h.name, gps: false }; }
    return { lat: area.lat, lng: area.lng, name: area.name || hwHome().name, gps: !!area.fromGps };
  }
  // js/29 calls this whenever the area now (or home waters) changes: repaint the feed if it is on screen
  function pubAreaChanged() { if (typeof renderPublic === "function") renderPublic(); }
  const pubSave = () => { try { localStorage.setItem("fm-pub-filters", JSON.stringify(pubF)); } catch (e) { /* fine */ } };
  const pubSinceIso = () => pubF.days ? new Date(Date.now() - pubF.days * 86400000).toISOString() : null;
  const pubKind = c => { const f = typeof seasonFor === "function" ? seasonFor(c.species) : null; return f ? f.name : cap((c.species || "Fish").trim()); };
  const pubSpot = c => (typeof spotsAll !== "undefined" ? spotsAll : []).find(x => x.id === c.spot_id) || (spots || []).find(x => x.id === c.spot_id);
  const pubHasPhoto = c => ((pubPhotos[c.id] || []).length > 0);

  // which of the loaded public catches to show
  function pubFilter(list) {
    const near = pubScope() !== "global", ctr = near ? pubCenter() : null;
    return list.filter(c => {
      if (c.review_state === "blurred") return false;
      const since = pubSinceIso(); if (since && !(c.caught_at >= since)) return false;   // the database already did this; kept for cached lists
      if (near) {
        const s = pubSpot(c);
        if (!s || s.lat == null || s.lng == null || miles(ctr.lat, ctr.lng, s.lat, s.lng) > PUB_LOCAL_MI) return false;
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
    // 📍 Local · 🏠 Home (only while you are away from home waters) · 🌎 Global
    const feeds = [["local", "📍 Local"]]; if (pubAway()) feeds.push(["home", "🏠 Home"]); feeds.push(["global", "🌎 Global"]);
    chips("Which feed", feeds, pubScope(), v => { pubF.scope = v; if (v === "local" && typeof hwLocate === "function") hwLocate(false); });
    if (pubScope() === "local" && !area.fromGps && navigator.geolocation && typeof hwLocate === "function") {   // not following your phone yet: offer it
      const gps = el("button", "linkbtn", "📍 Use where I am now"); gps.type = "button";
      gps.addEventListener("click", () => hwLocate(true));
      bar.appendChild(gps);
    }
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
    const sc = pubScope(), s = n === 1 ? "" : "es";
    if (sc === "home") return `🏠 ${n} public catch${s} within ${PUB_LOCAL_MI} miles of your home waters (${pubCenter().name}), ${when}.`;
    if (sc === "local") { const c = pubCenter(); return `📍 ${n} public catch${s} within ${PUB_LOCAL_MI} miles of ${c.gps ? "you" : c.name}, ${when}.`; }
    return `🌎 ${n} public catch${n === 1 ? "" : "es"}, ${when}.`;
  }
