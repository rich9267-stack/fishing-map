  // ---- 🏁 Fish race: pick one of your ranked fish and race it down a straight 5-lane course ----
  // The DATABASE runs the race (run_race, setup/46–47): it picks the other 4 lanes (friends' fish of about your fish's race speed,
  // then "wild" fish), rolls the luck, decides the places and pays 10 coins per win (up to 3 paid wins a day). The app only
  // asks and then plays the result back as an animation: each lane swims the first half at its first-half pace, then the second.
  let raceSel = null, raceBusy = false, raceLast = null, raceRecord = null, raceAnim = 0, raceMode = "class";
  try { raceSel = localStorage.getItem("fm-race-fish"); const m = localStorage.getItem("fm-race-mode"); raceMode = m === "open" || m === "rooms" ? m : "class"; } catch (e) { /* private mode: just don't remember */ }
  // Race classes — the same numbers as the database (race_time / race_class, setup/47–48). Lower race time = faster.
  const raceTime = (speed, stamina) => 50 / (40 + speed) + 50 / ((40 + speed) * (0.55 + 0.45 * stamina / 100));
  const RACE_CLASSES = [[0.95, "S", "⚡"], [1.30, "A", ""], [1.70, "B", ""], [Infinity, "C", "🐢"]];
  const raceClass = (speed, stamina) => { const t = raceTime(speed, stamina); return RACE_CLASSES.find(c => t < c[0])[1]; };
  const classTag = c => { const x = RACE_CLASSES.find(r => r[1] === c); return c ? `${x && x[2] ? x[2] + " " : ""}Class ${c}` : ""; };
  const RACE_SECONDS = 6;              // how long the winner takes on screen
  const placeText = p => ["", "🥇 1st", "🥈 2nd", "🥉 3rd", "4th", "5th"][p] || `#${p}`;

  async function raceLoadRecord() {
    if (raceRecord || !me || typeof db === "undefined" || !db) return;
    try {
      const { data, error } = await db.from("race_results").select("place").eq("user_id", me.id).limit(5000);
      if (error) throw error;
      raceRecord = { races: (data || []).length, wins: (data || []).filter(r => r.place === 1).length };
      renderRace();
    } catch (e) { raceRecord = { races: 0, wins: 0, unknown: true }; }
  }

  function renderRace() {
    const box = $("race-body"); if (!box || !me) return;
    box.innerHTML = "";
    const { list } = myFishList();
    if (!list.length) {
      box.appendChild(emptyBox("You need a ranked fish to race — log a catch with a photo and a length.", "➕ Log a catch", () => { const f = $("qc-fab"); if (f) f.click(); }));
      return;
    }
    list.sort((a, b) => b.rk.power - a.rk.power);
    if (!list.some(x => x.c.id === raceSel)) raceSel = list[0].c.id;
    // Class race (your class only, 10 coins) or Open (any fish, 20 coins)
    const modes = el("div", "fchips"); modes.setAttribute("role", "radiogroup"); modes.setAttribute("aria-label", "Kind of race");
    [["class", "🏁 Class race"], ["open", "🌎 Open"], ["rooms", "👥 Race friends"]].forEach(([k, t]) => {
      const b = el("button", "fchip" + (raceMode === k ? " on" : ""), t); b.type = "button";
      b.setAttribute("role", "radio"); b.setAttribute("aria-checked", raceMode === k ? "true" : "false");
      b.addEventListener("click", () => { raceMode = k; raceLast = null; try { localStorage.setItem("fm-race-mode", k); } catch (e) { /* fine */ } renderRace(); });
      modes.appendChild(b);
    });
    box.appendChild(modes);
    const sel = list.find(x => x.c.id === raceSel);
    if (raceMode !== "rooms") box.appendChild(el("div", "spot-meta", raceMode === "open"
      ? "Open: any fish can race, so the fast kinds (mahi, tunny, wahoo) usually win. Friends bring their fastest fish. 🪙 20 per win."
      : "Class race: only fish of your fish's class (⚡ S fastest … 🐢 C slowest), matched to about your speed. Speed matters most; Stamina keeps it going late. 🪙 10 per win."));
    const pick = el("div", "race-pick"); pick.setAttribute("role", "radiogroup"); pick.setAttribute("aria-label", "Your racer");
    list.forEach(x => {
      const on = x.c.id === raceSel;
      const b = el("button", "race-fish" + (on ? " on" : "")); b.type = "button";
      b.setAttribute("role", "radio"); b.setAttribute("aria-checked", on ? "true" : "false");
      b.appendChild(fishSvg(x.c.species, 44));
      b.appendChild(el("span", "race-fname", cap((x.c.species || "").trim())));
      b.appendChild(el("span", "race-class", classTag(raceClass(x.rk.stats.speed, x.rk.stats.stamina))));
      b.appendChild(el("span", "spot-meta", `⚡ ${x.rk.stats.speed} · ❤️ ${x.rk.stats.stamina}`));
      b.addEventListener("click", () => { raceSel = x.c.id; try { localStorage.setItem("fm-race-fish", raceSel); } catch (e) { /* fine */ } renderRace(); });
      pick.appendChild(b);
    });
    box.appendChild(pick);
    if (raceMode === "rooms") { renderRooms(box, sel); return; }
    clearTimeout(roomsTimer);
    const go = el("button", "btn race-go", raceBusy ? "🏁 Lining up…" : "🏁 Race!"); go.type = "button"; go.disabled = raceBusy;
    go.addEventListener("click", raceGo);
    box.appendChild(go);
    const rec = raceLast ? raceLast.record : raceRecord;
    const pay = "coins are paid for up to 3 wins a day (class and Open together)";
    if (rec && !rec.unknown && rec.races) box.appendChild(el("div", "spot-meta", `Your record: ${rec.wins} win${rec.wins === 1 ? "" : "s"} in ${rec.races} race${rec.races === 1 ? "" : "s"} · ${pay}`));
    else box.appendChild(el("div", "spot-meta", cap(pay) + "."));
    const track = el("div", "race-track"); track.id = "race-track"; box.appendChild(track);
    if (raceLast) raceDraw(raceLast, true);
    else raceLoadRecord();
  }

  async function raceGo() {
    if (raceBusy || !raceSel || typeof db === "undefined" || !db) return;
    raceBusy = true; renderRace();
    let res = null, err = null;
    try {
      const r = await db.rpc("run_race", { p_catch: raceSel, p_mode: raceMode });
      if (r.error) throw r.error;
      res = r.data; if (!res || !Array.isArray(res.lanes)) throw new Error("no race came back");
    } catch (e) { err = e; }
    raceBusy = false;
    if (err) {
      renderRace();
      const msg = String((err && err.message) || "");
      const t = $("race-track");
      if (t) t.appendChild(el("div", "spot-meta", navigator.onLine === false ? "📴 You're offline — races need a connection." : "⚠️ " + (msg && msg.length < 120 ? msg : "The race couldn't start. Try again in a moment.")));
      return;
    }
    raceLast = res; raceRecord = res.record;
    if (res.wallet && typeof walletDraw === "function") { wallet = res.wallet; walletDraw(); }
    renderRace();
    raceDraw(res, false);
  }

  // Draw the 5 lanes and play the race back (or show it finished straight away: replay, or reduced motion).
  // `trackEl` / `after`: draw somewhere else (a race room card) and show a different result box.
  function raceDraw(res, finished, trackEl, after) {
    const track = trackEl || $("race-track"); if (!track) return;
    track.innerHTML = "";
    const lanes = res.lanes.slice().sort((a, b) => a.lane - b.lane);
    const best = Math.min(...lanes.map(l => +l.total)), scale = RACE_SECONDS / best;   // seconds on screen per race-time unit
    const rows = lanes.map(l => {
      const row = el("div", "race-lane" + (l.kind === "me" ? " me" : ""));
      const who = l.kind === "me" ? "You" : l.kind === "friend" ? l.who : "🌊 Wild";
      row.appendChild(el("div", "race-who", `${who} · ${cap(l.species)}${l.class ? " · " + classTag(l.class) : ""}`));
      const water = el("div", "race-water"), f = el("span", "race-swimmer");
      f.appendChild(fishSvg(l.species, 40, false));
      water.appendChild(f); water.appendChild(el("span", "race-finish"));
      const tag = el("span", "race-place", ""); water.appendChild(tag);
      row.appendChild(water); track.appendChild(row);
      return { l, f, tag, t1: +l.t1 * scale, t2: +l.t2 * scale };
    });
    const done = () => {
      rows.forEach(r => { r.f.style.left = "calc(100% - 44px)"; r.tag.textContent = placeText(r.l.place); });
      (after || raceResult)(res, track);
    };
    const reduced = typeof tankReduced === "function" && tankReduced();
    if (finished || reduced || typeof requestAnimationFrame !== "function") { done(); return; }
    const id = ++raceAnim, start = performance.now();
    const step = now => {
      if (id !== raceAnim || !document.body.contains(track)) return;     // a newer race started, or the screen changed
      const s = (now - start) / 1000;
      let all = true;
      rows.forEach(r => {
        const pct = s < r.t1 ? 50 * s / r.t1 : Math.min(100, 50 + 50 * (s - r.t1) / r.t2);
        if (pct < 100) all = false;
        else if (!r.tag.textContent) r.tag.textContent = placeText(r.l.place);
        r.f.style.left = `calc(${pct}% - ${pct * 0.44}px)`;
      });
      if (all) done(); else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function raceResult(res, track) {
    if (track.querySelector(".race-result")) return;
    const box = el("div", "race-result");
    box.setAttribute("role", "status");
    const won = res.place === 1;
    const where = res.mode === "open" ? " the Open" : res.class ? ` in Class ${res.class}` : "";
    box.appendChild(el("b", null, won ? `🏆 Your fish won${where}!` : `Your fish came ${placeText(res.place).replace(/^\S+ /, "")}${res.mode === "open" ? " in the Open" : where}.`));
    if (res.coins > 0) {
      box.appendChild(el("div", "spot-meta", `🪙 +${res.coins} coins (${res.paid_wins_today} of ${res.paid_wins_cap} paid wins today)`));
      if (typeof snd === "function") snd("coin");
    } else if (won) box.appendChild(el("div", "spot-meta", `No coins this time — you've had today's ${res.paid_wins_cap} paid wins. It still counts for your record.`));
    else box.appendChild(el("div", "spot-meta", "Try again, or race a different fish."));
    track.appendChild(box);
  }

  // ---- 👥 Race friends: multiplayer race rooms. The database does everything (setup/49–50): entry fees, who may join,
  // the race itself and the 60/30/10 payout. The app lists rooms, lets you open/join/leave/start/cancel, and plays results back. ----
  let rooms = null, roomsBusy = false, roomsErr = "", roomsTimer = null, roomNew = null, roomWatch = null, roomOpen = null;
  const ROOM_FEES = [0, 10, 25, 50, 100], ROOM_STARTS = [[15, "15 min"], [60, "1 hour"], [180, "3 hours"], [1440, "Tomorrow"]];
  const roomLabel = c => c === "open" ? "🌎 Open" : classTag(c);
  function roomWhen(r) {
    if (r.status === "cancelled") return "cancelled — fees returned";
    if (r.status === "done") return "finished " + new Date(r.finished_at).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" });
    const m = Math.round((new Date(r.starts_at) - Date.now()) / 60000);
    if (m <= 0) return "starting now";
    if (m < 60) return `starts in ${m} min`;
    const h = Math.floor(m / 60), rest = m % 60;
    return `starts in ${h} h${rest ? " " + rest + " min" : ""}`;
  }
  async function roomsLoad() {
    if (roomsBusy || !me || typeof db === "undefined" || !db) return;
    roomsBusy = true;
    try {
      const r = await db.rpc("race_rooms_list");
      if (r.error) throw r.error;
      rooms = (r.data && r.data.rooms) || []; roomsErr = "";
      if (r.data && r.data.wallet && typeof walletDraw === "function") { wallet = r.data.wallet; walletDraw(); }
    } catch (e) { roomsErr = navigator.onLine === false ? "📴 You're offline — race rooms need a connection." : "⚠️ Couldn't load the races. Pull to refresh or try again."; if (!rooms) rooms = []; }
    roomsBusy = false;
    if (raceMode === "rooms") renderRace();
  }
  // refresh every 20 s while this tab is on screen, so joins and results show up without reloading
  function roomsPoll() {
    clearTimeout(roomsTimer);
    roomsTimer = setTimeout(() => {
      const view = $("view-insights");
      if (raceMode !== "rooms" || !view || view.hidden) return;
      if (!document.hidden) roomsLoad();
      roomsPoll();
    }, 20000);
  }
  async function roomCall(fn, args) {
    try {
      const r = await db.rpc(fn, args);
      if (r.error) throw r.error;
      if (r.data && r.data.wallet && typeof walletDraw === "function") { wallet = r.data.wallet; walletDraw(); }
      return r.data || {};
    } catch (e) {
      const msg = String((e && e.message) || "");
      alert(navigator.onLine === false ? "📴 You're offline — try again when you have a connection." : msg && msg.length < 140 ? msg : "That didn't work. Try again in a moment.");
      return null;
    } finally { roomsLoad(); }
  }

  function renderRooms(box, sel) {
    const selClass = sel ? raceClass(sel.rk.stats.speed, sel.rk.stats.stamina) : null;
    const selName = sel ? cap((sel.c.species || "").trim()) : "fish";
    box.appendChild(el("div", "spot-meta", `Race your friends for real coins. Everyone pays the same entry fee; the pot goes 🥇 60% · 🥈 30% · 🥉 10%. ` +
      `🪙 You have ${wallet && typeof wallet.coins === "number" ? wallet.coins : "…"} coins.`));
    // ＋ New race
    if (!roomNew) {
      const nb = el("button", "btn race-go", `＋ Open a race with your ${selName}`); nb.type = "button";
      nb.addEventListener("click", () => { roomNew = { cls: selClass || "open", fee: 10, mins: 60 }; renderRace(); });
      box.appendChild(nb);
    } else box.appendChild(roomForm(sel, selClass, selName));
    // the rooms
    const list = el("div", "room-list"); list.id = "room-list"; box.appendChild(list);
    if (roomsErr) list.appendChild(el("div", "spot-meta", roomsErr));
    if (rooms === null) { list.appendChild(el("div", "spot-meta", "Loading races…")); roomsLoad(); }
    else if (!rooms.length) list.appendChild(el("div", "spot-meta", "No races right now. Open one — your friends get a phone alert."));
    else rooms.forEach(r => list.appendChild(roomCard(r, sel, selClass, selName)));
    roomsPoll();
  }

  function roomForm(sel, selClass, selName) {
    const f = el("div", "room-form");
    const row = (label, opts, key, fmt) => {
      f.appendChild(el("div", "label", label));
      const chips = el("div", "fchips"); chips.setAttribute("role", "radiogroup"); chips.setAttribute("aria-label", label);
      opts.forEach(o => {
        const v = Array.isArray(o) ? o[0] : o, on = roomNew[key] === v;
        const b = el("button", "fchip" + (on ? " on" : ""), fmt(o)); b.type = "button";
        b.setAttribute("role", "radio"); b.setAttribute("aria-checked", on ? "true" : "false");
        b.addEventListener("click", () => { roomNew[key] = v; renderRace(); });
        chips.appendChild(b);
      });
      f.appendChild(chips);
    };
    row("Class", [selClass, "open"].filter(Boolean), "cls", c => roomLabel(c));
    f.appendChild(el("div", "spot-meta", roomNew.cls === "open" ? "Open: friends can enter any fish." : `Only ${classTag(roomNew.cls)} fish can enter. Your ${selName} is ${classTag(selClass)}.`));
    row("Entry fee", ROOM_FEES, "fee", v => v ? `🪙 ${v}` : "Free");
    row("Starts in", ROOM_STARTS, "mins", o => o[1]);
    f.appendChild(el("div", "spot-meta", "The race also starts as soon as 5 fish are in, or when you press Start (2+ fish). If fewer than 2 fish are in at the start time, it's cancelled and everyone gets their fee back."));
    const bar = el("div", "room-actions");
    const go = el("button", "btn", "🏁 Open race"); go.type = "button";
    go.addEventListener("click", async () => {
      if (!sel) return;
      if (roomNew.fee > 0 && !await askOk(`Open a ${roomLabel(roomNew.cls)} race with your ${selName}?\nYou pay the ${roomNew.fee}-coin entry fee now (you get it back if the race is cancelled).`)) return;
      go.disabled = true;
      const r = await roomCall("race_room_create", { p_class: roomNew.cls, p_fee: roomNew.fee, p_catch: sel.c.id, p_minutes: roomNew.mins });
      if (r) { roomNew = null; if (typeof toast === "function") toast("🏁 Race opened — your friends will get an alert.", 4000); }
      renderRace();
    });
    const no = el("button", "btn ghost", "Never mind"); no.type = "button";
    no.addEventListener("click", () => { roomNew = null; renderRace(); });
    bar.append(go, no); f.appendChild(bar);
    return f;
  }

  function roomCard(r, sel, selClass, selName) {
    const isHost = r.host === me.id, card = el("div", "room-card" + (r.mine ? " mine" : "") + (r.id === roomOpen ? " hi" : ""));
    card.id = "room-" + r.id;
    const head = el("div", "room-head");
    head.appendChild(el("b", null, `${roomLabel(r.class)} race`));
    head.appendChild(el("span", "room-fee", r.fee ? `🪙 ${r.fee} entry · pot ${r.pot}` : "Free"));
    card.appendChild(head);
    card.appendChild(el("div", "spot-meta", `${isHost ? "Your race" : "by " + (r.host_name || "a friend")} · ${roomWhen(r)} · ${r.players.length} of 5 fish`));
    const ul = el("ul", "room-players");
    r.players.slice().sort((a, b) => (a.place || 9) - (b.place || 9)).forEach(p => {
      const li = el("li", p.user_id === me.id ? "me" : "");
      li.textContent = `${p.place ? placeText(p.place) + " " : ""}${p.user_id === me.id ? "You" : p.who} · ${cap(p.species)} · ${classTag(p.class)}${p.payout ? ` · +${p.payout} 🪙` : ""}`;
      ul.appendChild(li);
    });
    card.appendChild(ul);
    const bar = el("div", "room-actions");
    const btn = (text, cls, fn) => { const b = el("button", "btn" + (cls ? " " + cls : ""), text); b.type = "button"; b.addEventListener("click", async () => { b.disabled = true; await fn(); }); bar.appendChild(b); return b; };
    if (r.status === "open") {
      if (r.mine) {
        if (isHost) {
          const st = btn("▶ Start now", "", async () => { const x = await roomCall("race_room_start", { p_room: r.id }); if (x) { roomWatch = r.id; roomWatchPlay = true; roomOpen = r.id; } });
          if (r.players.length < 2) { st.disabled = true; st.title = "Needs at least 2 fish"; }
          btn("✖ Cancel race", "ghost", async () => { if (await askOk("Cancel this race? Everyone gets their fee back.")) await roomCall("race_room_cancel", { p_room: r.id }); else renderRace(); });
        } else btn("Leave (fee back)", "ghost", async () => { if (await askOk("Leave this race? Your entry fee comes back.")) await roomCall("race_room_leave", { p_room: r.id }); else renderRace(); });
      } else if (r.players.length >= 5) card.appendChild(el("div", "spot-meta", "This race is full."));
      else if (!sel) card.appendChild(el("div", "spot-meta", "Pick a racer above to join."));
      else if (r.class !== "open" && r.class !== selClass) card.appendChild(el("div", "spot-meta", `Your ${selName} is ${classTag(selClass)} — pick a ${classTag(r.class)} fish above to join.`));
      else btn(`Join with your ${selName}${r.fee ? ` · 🪙 ${r.fee}` : ""}`, "", async () => {
        if (!await askOk(`Enter your ${selName} in ${r.host_name || "your friend"}'s ${roomLabel(r.class)} race?${r.fee ? `\nEntry fee: ${r.fee} coins.` : ""}`)) { renderRace(); return; }
        const x = await roomCall("race_room_join", { p_room: r.id, p_catch: sel.c.id });
        if (x && typeof toast === "function") toast(x.status === "done" ? "🏁 You were the 5th fish — the race just ran!" : "🏁 You're in! We'll alert you when it's over.", 4000);
        if (x && x.status === "done") { roomWatch = r.id; roomWatchPlay = true; roomOpen = r.id; }
      });
    } else if (r.status === "done" && Array.isArray(r.lanes) && r.lanes.length) {
      btn(roomWatch === r.id ? "↻ Watch again" : "▶ Watch the race", "", async () => { roomWatch = r.id; roomWatchPlay = true; renderRace(); });
    }
    if (bar.childNodes.length) card.appendChild(bar);
    if (roomWatch === r.id && r.status === "done" && Array.isArray(r.lanes)) {
      const track = el("div", "race-track"); card.appendChild(track);
      const lanes = r.lanes.map(l => ({ ...l, kind: l.user_id === me.id ? "me" : "friend" }));
      const play = roomWatchPlay; roomWatchPlay = false;
      setTimeout(() => raceDraw({ lanes }, !play, track, (res, t) => roomResult(r, t)), 0);
    }
    if (r.id === roomOpen) setTimeout(() => { if (card.scrollIntoView) card.scrollIntoView({ behavior: "smooth", block: "center" }); roomOpen = null; }, 50);
    return card;
  }
  let roomWatchPlay = false;
  function roomResult(r, track) {
    if (track.querySelector(".race-result")) return;
    const box = el("div", "race-result"); box.setAttribute("role", "status");
    const mine = r.players.find(p => p.user_id === me.id);
    if (mine && mine.place) box.appendChild(el("b", null, mine.place === 1 ? `🏆 You won${mine.payout ? " " + mine.payout + " coins" : ""}!` : `You came ${placeText(mine.place).replace(/^\S+ /, "")}${mine.payout ? " — +" + mine.payout + " coins" : ""}.`));
    box.appendChild(el("div", "spot-meta", `Pot ${r.pot} coins: ` + r.players.filter(p => p.payout).sort((a, b) => a.place - b.place).map(p => `${placeText(p.place)} ${p.user_id === me.id ? "You" : p.who} +${p.payout}`).join(" · ")));
    track.appendChild(box);
  }
  // A phone alert link (?go=race&room=<id>) opens the rooms and shows that race (and plays it if it's over).
  function raceOpenRoom(id) {
    raceMode = "rooms"; roomOpen = +id || null; rooms = null;
    if (roomOpen) { roomWatch = roomOpen; roomWatchPlay = true; }
    if (typeof showView === "function") showView("insights");
    setTimeout(() => { const c = $("race-card"); if (c && c.scrollIntoView) c.scrollIntoView({ block: "start" }); }, 150);
  }

