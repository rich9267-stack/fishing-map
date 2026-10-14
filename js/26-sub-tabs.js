  // ---- 🧭 Sub-tabs (UX v2 step 3) ----
  // 📊 Stats: Insights · Records · Seasons · Species · Tackle. The cards inside #view-insights carry data-pane="insights|records|species|tackle"
  //   and only the chosen pane shows; Seasons stays its own page (view-seasons) with the same bar on top.
  // 👥 Community: Feed · Trips · Friends · Messages · Groups. The bar presses the old (hidden) buttons / uses the old cards, so every old
  //   link and alert still works; comSub (js/11) says which sub-tab is open and setFeedMode() shows the matching cards.
  let statsSub = "insights";
  try { const v = localStorage.getItem("fm-stats-sub"); if (["insights", "records", "species", "tackle"].includes(v)) statsSub = v; } catch (e) { /* fine */ }
  const STATS_SUBS = [["insights", "Insights"], ["records", "Records"], ["seasons", "Seasons"], ["species", "Species"], ["tackle", "Tackle"]];
  let spShowAll = false;

  function statsOpen(sub) {   // go to one Stats sub-tab (also what old links use: go=insights, "All charts for this fish")
    if (sub === "seasons") { if ($("view-seasons").hidden) $("tab-seasons").click(); window.scrollTo({ top: 0 }); return; }
    statsSub = sub; try { localStorage.setItem("fm-stats-sub", sub); } catch (e) { /* fine */ }
    if ($("view-insights").hidden) $("tab-insights").click(); else statsApply();
    window.scrollTo({ top: 0 });
  }
  function statsApply() {
    $("view-insights").querySelectorAll("[data-pane]").forEach(n => { n.hidden = n.dataset.pane !== statsSub; });
    [["view-insights", statsSub], ["view-seasons", "seasons"]].forEach(([v, cur]) => $(v).querySelectorAll(".sub-tabs button").forEach(b => {
      const on = b.dataset.sub === cur; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on));
    }));
    if (statsSub === "species" && !$("view-insights").hidden) statsSpecies();
  }
  function statsSpecies() {   // 🐟 My fish (same collection as Play › My fish) + a searchable list that opens each fish's species page
    if (typeof renderMyFish === "function") renderMyFish();
    const box = $("sp-entry-list"), more = $("sp-entry-more"); if (!box) return;
    const q = $("sp-q").value.trim().toLowerCase();
    const mine = {};
    try {
      Object.values(catchesBySpot).flat().filter(isMine).forEach(c => {
        if (!c.species) return;
        const f = seasonFor(c.species), k = f ? f.name : cap(c.species.trim());
        mine[k] = (mine[k] || 0) + (c.how_many || 1);
      });
    } catch (e) { /* no catches loaded yet */ }
    const names = new Set(SEASONS.map(x => x.name)); Object.keys(mine).forEach(k => names.add(k));
    const list = [...names].filter(n => !q || n.toLowerCase().includes(q)).sort((a, b) => (mine[b] || 0) - (mine[a] || 0) || a.localeCompare(b));
    const limit = q || spShowAll ? list.length : 24;
    box.innerHTML = "";
    list.slice(0, limit).forEach(n => {
      const b = el("button", "fchip", mine[n] ? `${n} (${mine[n]})` : n); b.type = "button";
      if (mine[n]) b.title = `${mine[n]} caught by you`;
      b.addEventListener("click", () => { if (typeof openSpecies === "function") openSpecies(n); });
      box.appendChild(b);
    });
    if (!list.length) box.appendChild(el("div", "spot-meta", `No fish match “${$("sp-q").value.trim()}”.`));
    more.hidden = !(list.length > limit);
    if (!more.hidden) more.textContent = `Show all ${list.length} fish`;
  }
  $("sp-q").addEventListener("input", () => statsSpecies());
  $("sp-entry-more").addEventListener("click", () => { spShowAll = true; statsSpecies(); });
  ["insights", "seasons"].forEach(page => {   // the bar sits under the "Stats" title on both pages
    const bar = el("div", "sub-tabs tight"); bar.setAttribute("role", "tablist"); bar.setAttribute("aria-label", "Stats");
    STATS_SUBS.forEach(([k, t]) => {
      const b = el("button", null, t); b.type = "button"; b.dataset.sub = k; b.setAttribute("role", "tab");
      b.addEventListener("click", () => statsOpen(k)); bar.appendChild(b);
    });
    $(page + "-title").after(bar);
  });
  statsApply();

  // ---- 👥 Community ----
  let comMarking = false;
  function closeComCards() {   // Friends and Messages are cards inside Community; only the open sub-tab's card stays
    if (!$("friends-card").hidden) $("friends-card").hidden = true;
    if (!$("chat-card").hidden) { $("chat-card").hidden = true; clearInterval(chatTimer); chatWith = null; }
  }
  function comMark(sub) {   // make `sub` the open Community sub-tab and repaint (old buttons and links call this too)
    if (comMarking) return; comMarking = true;
    try {
      comSub = sub;
      if (sub !== "friends" && !$("friends-card").hidden) $("friends-card").hidden = true;
      if (sub !== "messages" && !$("chat-card").hidden) { $("chat-card").hidden = true; clearInterval(chatTimer); chatWith = null; }
      if (sub === "trips") feedMode = "circle"; else if (sub === "groups") feedMode = "groups"; else if (feedMode === "groups") feedMode = "circle";
      if ($("view-feed").hidden) showView("feed"); else setFeedMode(feedMode);
    } finally { comMarking = false; }
    comSync();
  }
  function comReset() {   // arriving at Community from another page: open on the Feed (unless a link is taking you to Groups)
    if (comMarking) return;
    if (feedMode !== "groups") comSub = "feed";
    if (comSub !== "friends") $("friends-card").hidden = true;
    if (comSub !== "messages" && !$("chat-card").hidden) { $("chat-card").hidden = true; clearInterval(chatTimer); chatWith = null; }
  }
  function comSync() {
    const sw = $("com-sw"), seg = $("com-seg"); if (!sw || !seg) return;
    sw.querySelectorAll("button").forEach(b => { const on = b.dataset.sub === comSub; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); });
    seg.hidden = comSub !== "feed";
    const pub = feedMode === "public";
    seg.querySelectorAll("button").forEach(b => { const on = (b.dataset.feedmode === "public") === pub; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
  }
  function comOpen(sub) {
    if (sub === "friends") $("friends-btn").click();
    else if (sub === "messages") $("chat-btn").click();
    else if (sub === "groups") { grOpen = null; comMark("groups"); }
    else comMark(sub);
    window.scrollTo({ top: 0 });
  }
  $("com-sw").addEventListener("click", e => { const b = e.target.closest("[data-sub]"); if (b) comOpen(b.dataset.sub); });
  $("com-seg").addEventListener("click", e => { const b = e.target.closest("[data-feedmode]"); if (b) $("feed-mode-" + b.dataset.feedmode).click(); });
  // unread badges: read the numbers the old buttons already show, e.g. "💬 Messages (2)" and "👥 Friends (1)" (= waiting requests)
  (function comBadges() {
    const num = id => +((/\((\d+)\)/.exec($(id).textContent) || [])[1] || 0);
    const paint = () => [["friends-btn", "com-b-friends"], ["chat-btn", "com-b-messages"]].forEach(([src, dst]) => { const n = num(src); $(dst).hidden = !n; $(dst).textContent = n; });
    ["friends-btn", "chat-btn"].forEach(id => new MutationObserver(paint).observe($(id), { childList: true, characterData: true, subtree: true }));
    paint();
  })();
  comSync();
