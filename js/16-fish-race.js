  // ---- 🏁 Fish race: pick one of your ranked fish and race it down a straight 5-lane course ----
  // The DATABASE runs the race (run_race, setup/46–47): it picks the other 4 lanes (friends' fish of about your fish's race speed,
  // then "wild" fish), rolls the luck, decides the places and pays 10 coins per win (up to 3 paid wins a day). The app only
  // asks and then plays the result back as an animation: each lane swims the first half at its first-half pace, then the second.
  let raceSel = null, raceBusy = false, raceLast = null, raceRecord = null, raceAnim = 0, raceMode = "class";
  try { raceSel = localStorage.getItem("fm-race-fish"); raceMode = localStorage.getItem("fm-race-mode") === "open" ? "open" : "class"; } catch (e) { /* private mode: just don't remember */ }
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
    [["class", "🏁 Class race"], ["open", "🌎 Open"]].forEach(([k, t]) => {
      const b = el("button", "fchip" + (raceMode === k ? " on" : ""), t); b.type = "button";
      b.setAttribute("role", "radio"); b.setAttribute("aria-checked", raceMode === k ? "true" : "false");
      b.addEventListener("click", () => { raceMode = k; raceLast = null; try { localStorage.setItem("fm-race-mode", k); } catch (e) { /* fine */ } renderRace(); });
      modes.appendChild(b);
    });
    box.appendChild(modes);
    box.appendChild(el("div", "spot-meta", raceMode === "open"
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
  function raceDraw(res, finished) {
    const track = $("race-track"); if (!track) return;
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
      raceResult(res, track);
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
