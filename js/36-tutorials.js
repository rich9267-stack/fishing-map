  // ---- 🧭 Screen tutorials (v117, setup/73) ----
  // One short intro card per tab (Home, Map, Play, Compete, Community, Stats) + the Me/Settings page, shown ONCE per person, plus a one-time
  // tip after the first photo. The "?" button (top right, next to your picture) brings back the card for the screen you are on.
  // "Seen" is kept in your private tutorials_seen rows (so it follows you to every phone) and mirrored on this phone (fm-tut-<id>).
  // The card text is the approved wording in the Project doc claude/tutorial-design.md. **x** shows x in bold.
  const TUTS = {
    home:      { title: "Your spot for today 🏠",       text: "Check tide, wind, and the best spot before you go. Tap the **+** any time you land one.", target: "#bn-log" },
    map:       { title: "Find water 🗺",                text: "Spots, ramps, and parks are all here. Tap the layers button to turn things on and off.", target: "#map-layers-btn" },
    play:      { title: "Your fish, swimming 🐠",       text: "Your tank, your best catches, and fish races — all in one place.", target: "#play-sw" },
    games:     { title: "Quick games 🎮",               text: "Play a round while you wait for the tide.", target: "#games-card .games-list", local: true },
    compete:   { title: "Contests and tournaments 🏆",  text: "Join one, track how you're doing, and see who's winning.", target: "#ct-body" },
    community: { title: "Friends and the feed 👥",      text: "Catches, trips, friends, messages, and groups — tap a tab to switch.", target: "#com-sw" },
    stats:     { title: "See how you're doing 📊",      text: "Your top catches, records, and the year so far — all in one place.", target: "#view-insights:not([hidden]) .sub-tabs, #view-seasons:not([hidden]) .sub-tabs" },
    settings:  { title: "Make it yours ⚙️",             text: "Alerts, privacy, units, offline maps — set them up here, any time.", target: "#me-card:not([hidden]) .me-grp" },
    "photo-tip": { title: "We'll ID it for you 🐟",     text: "Hold the fish flat to measure it, and we'll take a guess at the species too.", target: "#qc-id-box:not([hidden])" }
  };
  let tutSeen = new Set(), tutReady = false, tutShowing = null, tutOpener = null, tutTries = 0, tutTimer = null;
  const tutLocalKey = () => "fm-tut-" + (me ? me.id : "");
  function tutSaveLocal() { try { localStorage.setItem(tutLocalKey(), JSON.stringify([...tutSeen])); } catch (e) { /* this phone only forgets */ } }
  async function tutSend(k) {   // add the row once; if it's already there nothing changes (needs only the "add" permission)
    if (TUTS[k] && TUTS[k].local) return;   // 🎮 Games: remembered on this phone only (the account list allows the 8 keys of setup/73)
    try { await db.from("tutorials_seen").upsert({ user_id: me.id, screen_key: k }, { onConflict: "user_id,screen_key", ignoreDuplicates: true }); } catch (e) { /* this phone remembers; it syncs at the next sign-in */ }
  }
  async function tutLoadMine() {
    if (!db || !me) return;
    tutReady = false; tutSeen = new Set(); tutClose(false);
    let local = []; try { local = JSON.parse(localStorage.getItem(tutLocalKey()) || "[]").filter(k => TUTS[k]); } catch (e) { /* none */ }
    try {
      const { data, error } = await bootTake("tutorials", () => db.from("tutorials_seen").select("screen_key").eq("user_id", me.id));
      if (error) throw error;
      (data || []).forEach(r => tutSeen.add(r.screen_key));
      local.forEach(k => { if (!tutSeen.has(k)) { tutSeen.add(k); tutSend(k); } });   // seen while offline → save to the account now
      tutReady = true;
    } catch (e) {
      local.forEach(k => tutSeen.add(k));
      tutReady = local.length > 0;   // can't reach the account: trust this phone's memory, but never nag a brand-new phone
    }
    tutSaveLocal();
    setTimeout(() => tutMaybe(), 2500);   // let the welcome tour / "What's new" appear first
  }
  function tutCurrentKey() {
    const on = id => { const e = $(id); return !!e && e.classList.contains("on"); };
    if (!$("me-card").hidden || !$("settings-card").hidden) return "settings";
    if (on("tab-map")) return "map";
    if (on("tab-tank")) return $("games-card") && !$("games-card").hidden ? "games" : "play";
    if (on("tab-compete")) return "compete";
    if (on("tab-feed")) return "community";
    if (on("tab-insights") || on("tab-seasons")) return "stats";
    return "home";
  }
  function tutBlocked(key) {   // never stack on another pop-up
    if (document.querySelector("#welcome:not([hidden]), #whatsnew:not([hidden]), .ask-bg, #tut")) return true;
    if (key !== "photo-tip" && $("qc") && !$("qc").hidden) return true;
    const f = $("find-page"); if (f && !f.hidden) return true;
    return false;
  }
  function tutMaybe(key) {   // show this screen's card if this person hasn't seen it yet
    key = key || tutCurrentKey();
    if (!me || !tutReady || tutShowing || tutSeen.has(key) || !TUTS[key]) return;
    if ($("app").hidden) return;
    if (tutBlocked(key)) {   // try again in a moment (up to ~30 s) — e.g. while "What's new" is still open
      if (tutTries++ < 20) { clearTimeout(tutTimer); tutTimer = setTimeout(() => tutMaybe(), 1500); }
      return;
    }
    tutTries = 0;
    tutShow(key);
  }
  function tutPhotoTip() { if (me && tutReady && !tutSeen.has("photo-tip") && !tutShowing && !tutBlocked("photo-tip")) setTimeout(() => { if (!tutSeen.has("photo-tip") && !tutShowing) tutShow("photo-tip"); }, 350); }
  function tutText(node, s) { s.split("**").forEach((part, i) => { if (!part) return; const n = i % 2 ? document.createElement("strong") : document.createTextNode(part); if (i % 2) n.textContent = part; node.appendChild(n); }); }
  function tutShow(key, opener) {
    const t = TUTS[key]; if (!t) return;
    tutClose(false);
    tutShowing = key; tutOpener = opener || null;
    const wrap = document.createElement("div"); wrap.id = "tut"; wrap.className = "tut-wrap";
    const card = document.createElement("div"); card.className = "tut-card center"; card.setAttribute("role", "dialog"); card.setAttribute("aria-labelledby", "tut-title");
    const arrow = document.createElement("div"); arrow.className = "tut-arrow"; arrow.setAttribute("aria-hidden", "true");
    const h = document.createElement("div"); h.className = "tut-title"; h.id = "tut-title"; h.textContent = t.title;
    const p = document.createElement("div"); p.className = "tut-text"; tutText(p, t.text);
    const ok = document.createElement("button"); ok.type = "button"; ok.className = "btn tut-ok"; ok.id = "tut-ok"; ok.textContent = "Got it";
    ok.addEventListener("click", () => tutDone());
    card.append(h, p, ok, arrow); wrap.appendChild(card); document.body.appendChild(wrap);
    requestAnimationFrame(() => { tutPlace(); try { ok.focus({ preventScroll: true }); } catch (e) { /* fine */ } });
  }
  function tutPlace() {   // card above or below the thing to tap, arrow pointing at it; centred when that thing isn't on screen
    const wrap = $("tut"); if (!wrap || !tutShowing) return;
    const card = wrap.querySelector(".tut-card"), arrow = wrap.querySelector(".tut-arrow");
    let tgt = null; try { tgt = document.querySelector(TUTS[tutShowing].target); } catch (e) { /* none */ }
    const vh = window.innerHeight || 700, M = 10;
    let r = tgt ? tgt.getBoundingClientRect() : null;
    if (r && !(r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh)) r = null;
    card.classList.remove("up", "down", "center");
    if (!r) { card.classList.add("center"); card.style.top = ""; card.style.bottom = ""; return; }
    const cr = card.getBoundingClientRect(), cx = r.left + r.width / 2;
    arrow.style.left = Math.max(18, Math.min(cr.width - 18, cx - cr.left)) + "px";
    if (r.top + r.height / 2 > vh / 2) {   // target in the lower half → card above it
      card.classList.add("down"); card.style.top = "auto"; card.style.bottom = Math.max(M, vh - r.top + 14) + "px";
    } else {
      card.classList.add("up"); card.style.bottom = "auto"; card.style.top = Math.min(Math.max(M, r.bottom + 14), Math.max(M, vh - cr.height - M)) + "px";
    }
  }
  function tutClose(restoreFocus) {
    const w = $("tut"); if (w) w.remove();
    const op = tutOpener; tutShowing = null; tutOpener = null;
    if (restoreFocus && op) { try { op.focus({ preventScroll: true }); } catch (e) { /* fine */ } }
  }
  function tutDone() {   // "Got it": close, and remember it for good (a replay from "?" changes nothing)
    const k = tutShowing; tutClose(true);
    if (k && !tutSeen.has(k)) { tutSeen.add(k); tutSaveLocal(); if (db && me) tutSend(k); }
  }
  function tutReplay(opener) { if (me) tutShow(tutCurrentKey(), opener); }
  (function tutStart() {
    document.querySelectorAll(".tut-help").forEach(b => b.addEventListener("click", () => { if (tutShowing) tutDone(); else tutReplay(b); }));
    document.addEventListener("keydown", e => { if (e.key === "Escape" && tutShowing) tutDone(); });
    window.addEventListener("resize", tutPlace);
    window.addEventListener("scroll", tutPlace, { passive: true });
    // a new screen opened → drop an old card (it stays unseen) and show the new screen's card if it hasn't been seen
    const changed = () => { clearTimeout(tutTimer); tutTries = 0; tutTimer = setTimeout(() => { if (tutShowing) tutClose(false); tutMaybe(); }, 80); };
    ["tab-list", "tab-map", "tab-insights", "tab-seasons", "tab-tank", "tab-feed", "tab-compete"].forEach(id => { const n = $(id); if (n) new MutationObserver(changed).observe(n, { attributes: true, attributeFilter: ["class"] }); });
    [["me-card", ["hidden"]], ["settings-card", ["hidden", "data-show"]]].forEach(([id, a]) => { const n = $(id); if (n) new MutationObserver(changed).observe(n, { attributes: true, attributeFilter: a }); });
  })();
