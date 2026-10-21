  // ---- 🎮 Games (Games plan step 1): Play › Games is a list of game cards; the first new game is "Keeper or release?" ----
  // Fish race lives here too (its card opens the race screen, which is unchanged: showPlay("race") and ?go=race links still go straight to it).
  // Keeper or release? = the same 5 questions for everyone each day (picked from the New York date), built ONLY from the app's own
  // size & season rules (fishRules, js/10). Never anyone's catches or photos. Nothing is saved to the database: today's answers stay on this phone.
  let gamesScreen = "list";            // "list" | "keeper"
  let gamesRaceLeft = null;            // paid race wins left today (null = not loaded yet)
  const GAMES_RACE_CAP = 3;
  const KR_N = 5;
  const gamesDay = d => { try { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(d || new Date()); } catch (e) { return (d || new Date()).toISOString().slice(0, 10); } };
  const KR_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // A small seeded random number maker, so a date always gives the same questions
  function krRand(seedText) {
    let h = 1779033703 ^ seedText.length;
    for (let i = 0; i < seedText.length; i++) { h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
    let a = h >>> 0;
    return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  // Which rule rows can make a fair question: active, not tied to this year's special dates, and with something to decide on
  function krUsable(r) {
    if (!r || r.active === false) return false;
    if (Array.isArray(r.open_only) && r.open_only.some(([a]) => String(a).length > 5)) return false;   // year-by-year dates (red snapper): skip
    return !!(r.release_only || r.min_in != null || r.max_in != null || (Array.isArray(r.closed) && r.closed.length) || (Array.isArray(r.open_only) && r.open_only.length));
  }
  // Where the rule applies, in words ("Atlantic coast", "the Keys"…). A whole-state row that has coast rows beside it is the rule for here (Atlantic).
  function krWhere(r, rules) {
    if (r.regions && r.regions.length) return regionsText(r.regions);
    return rules.some(x => x !== r && x.species === r.species) ? "Atlantic coast" : "Florida";
  }
  const krTags = r => r.regions && r.regions.length ? [r.regions[0]] : ["atlantic"];
  // The answer, worked out from the rule (the same checks as the keeper checker in js/10)
  function krAnswer(r, len, when) {
    const sp = r.species;
    if (r.release_only) return { keep: false, why: `${sp} is catch-and-release only.` };
    if (seasonState(r, when) === "closed") return { keep: false, why: `${sp} season is closed on ${KR_MONTHS[when.getMonth()]} ${when.getDate()}.` };
    if (r.min_in != null && len < r.min_in) return { keep: false, why: `Too small: ${inch(len)} is under the ${inch(r.min_in)} minimum.` };
    if (r.max_in != null && len > r.max_in) return { keep: false, why: `Too big: ${inch(len)} is over the ${inch(r.max_in)} top of the slot.` };
    const size = r.min_in != null && r.max_in != null ? `inside the ${inch(r.min_in)}–${inch(r.max_in)} slot` : r.min_in != null ? `over the ${inch(r.min_in)} minimum` : r.max_in != null ? `under the ${inch(r.max_in)} maximum` : "fine (no size limit)";
    return { keep: true, why: `Keeper: the season is open and ${inch(len)} is ${size}.` };
  }
  // Today's 5: one question per species. Each picks Keep or one way to be a Release, then a date and a length that fit it.
  function krPick(day, rules) {
    rules = (rules || []).filter(krUsable);
    const rand = krRand("keeper-" + day), year = +day.slice(0, 4);
    const pickOf = a => a[Math.floor(rand() * a.length)];
    const half = (lo, hi) => Math.round((lo + rand() * (hi - lo)) * 2) / 2;
    const rows = rules.slice().sort((a, b) => (a.species + (a.regions || []).join()).localeCompare(b.species + (b.regions || []).join()));
    for (let i = rows.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [rows[i], rows[j]] = [rows[j], rows[i]]; }
    const days = [];
    for (let t = Date.UTC(year, 0, 1); new Date(t).getUTCFullYear() === year; t += 86400000) { const u = new Date(t); days.push(new Date(year, u.getUTCMonth(), u.getUTCDate(), 12)); }
    const out = [], used = new Set();
    for (const r of rows) {
      if (out.length >= KR_N) break;
      if (used.has(r.species)) continue;
      const open = days.filter(d => seasonState(r, d) === "open"), closed = days.filter(d => seasonState(r, d) === "closed");
      const lo = r.min_in != null ? +r.min_in + (r.measure === "fork" ? 1.5 : 0) : 8, hi = r.max_in != null ? +r.max_in : Math.max(lo + 4, lo * 1.6);
      const kinds = [];
      if (r.release_only) kinds.push("cr");
      else {
        if (open.length && lo <= hi) kinds.push("keep", "keep");
        if (closed.length) kinds.push("closed");
        if (open.length && r.min_in != null) kinds.push("small");
        if (open.length && r.max_in != null && !r.one_over) kinds.push("big");
      }
      if (!kinds.length) continue;
      const kind = pickOf(kinds);
      let when, len;
      if (kind === "cr") { when = pickOf(days); len = half(18, 60); }
      else if (kind === "closed") { when = pickOf(closed); len = half(lo, lo <= hi ? hi : lo + 4); }
      else if (kind === "small") { when = pickOf(open); len = half(Math.max(4, r.min_in * 0.6), r.min_in - 0.5); }
      else if (kind === "big") { when = pickOf(open); len = half(+r.max_in + 0.5, r.max_in * 1.3); }
      else { when = pickOf(open); len = half(lo, hi); }
      used.add(r.species);
      out.push({ rule: r, species: r.species, where: krWhere(r, rules), tags: krTags(r), len, when, measure: r.measure === "fork" ? "fork length" : "total length", ...krAnswer(r, len, when) });
    }
    return out;
  }
  // Today's answers on this phone only: { day, picks: [true/false…] } (true = said Keep)
  const krKey = () => "fm-keeper-" + (me ? me.id : "");
  function krLoad(day) { try { const s = JSON.parse(localStorage.getItem(krKey()) || "null"); if (s && s.day === day && Array.isArray(s.picks)) return s; } catch (e) { /* none */ } return { day, picks: [] }; }
  function krSave(s) { try { localStorage.setItem(krKey(), JSON.stringify(s)); } catch (e) { /* private mode: just this visit */ } }
  const krScore = (qs, s) => s.picks.filter((p, i) => qs[i] && p === qs[i].keep).length;
  // The rule's freshness line: the same wording as the keeper checker
  const krFresh = r => ruleStale(r) ? `⚠️ This rule was last checked ${ruleAge(r) == null ? "a while ago" : ruleAge(r) + " days ago"} — it may have changed, so confirm with FWC.` : `Always check the current FWC rules (checked ${r.verified_on}).`;

  async function gamesRaceLoad() {
    if (!me || typeof db === "undefined" || !db) return;
    try {
      const { data, error } = await db.from("race_results").select("coins").eq("user_id", me.id).eq("day", gamesDay()).gt("coins", 0);
      if (error) throw error;
      const left = Math.max(0, GAMES_RACE_CAP - (data || []).length);
      if (left !== gamesRaceLeft) { gamesRaceLeft = left; if (playSub === "games" && gamesScreen === "list") renderGames(); }
    } catch (e) { /* the card just leaves the count out */ }
  }

  function renderGames() {
    const box = $("games-body"); if (!box || !me) return;
    box.innerHTML = "";
    if (gamesScreen === "keeper") return krDraw(box);
    delete box.dataset.justAnswered;
    const head = el("div", "games-head");
    head.appendChild(el("h2", "games-title", "🎮 Games"));
    const help = el("button", "games-help", "?"); help.type = "button"; help.setAttribute("aria-label", "About Games");
    help.addEventListener("click", () => { if (typeof tutShow === "function") { if (tutShowing) tutDone(); else tutShow("games", help); } });
    head.appendChild(help); box.appendChild(head);
    box.appendChild(el("div", "spot-meta games-sub", "Play a quick round while you wait for the tide."));
    const day = gamesDay(), qs = krPick(day, fishRules), s = krLoad(day);
    const krStatus = !qs.length ? "Loading…" : s.picks.length >= qs.length ? `Done · ${krScore(qs, s)}/${qs.length}` : s.picks.length ? `${s.picks.length} of ${qs.length} done` : `Today's ${qs.length} ready`;
    const raceStatus = gamesRaceLeft == null ? "" : gamesRaceLeft ? `${gamesRaceLeft} win${gamesRaceLeft === 1 ? "" : "s"} left today` : "No paid wins left today";
    const list = el("div", "games-list"); list.setAttribute("role", "list");
    [
      { key: "bingo", icon: "🎲", name: "Fishing bingo", line: "Fills in by itself from your trips", status: "Coming soon", soon: true },
      { key: "guess", icon: "🔍", name: "Guess the fish", line: "Name the species from a photo", status: "Coming soon", soon: true },
      { key: "length", icon: "📏", name: "How long is it?", line: "Guess the length, closest wins", status: "Coming soon", soon: true },
      { key: "keeper", icon: "⚖️", name: "Keeper or release?", line: "Know the Florida size rules", status: krStatus, done: s.picks.length >= qs.length && qs.length > 0, go: () => { gamesScreen = "keeper"; renderGames(); window.scrollTo({ top: 0 }); } },
      { key: "race", icon: "🏁", name: "Fish race", line: "Solo, Open and races with friends", status: raceStatus, race: true, go: () => { showPlay("race"); window.scrollTo({ top: 0 }); } }
    ].forEach(g => {
      const b = el("button", "game-card" + (g.soon ? " soon" : "") + (g.race ? " race" : "") + (g.done ? " done" : "")); b.type = "button"; b.dataset.game = g.key;
      b.setAttribute("role", "listitem");
      if (g.soon) b.disabled = true;
      const ic = el("span", "game-ic", g.icon); ic.setAttribute("aria-hidden", "true"); b.appendChild(ic);
      const txt = el("span", "game-txt"); txt.appendChild(el("span", "game-name", g.name)); txt.appendChild(el("span", "game-line", g.line)); b.appendChild(txt);
      if (g.status) b.appendChild(el("span", "game-st", g.status));
      if (g.go) b.addEventListener("click", g.go);
      list.appendChild(b);
    });
    box.appendChild(list);
    gamesRaceLoad();
    if (typeof tutMaybe === "function") setTimeout(() => tutMaybe("games"), 400);
  }

  // The quiz screen: one question at a time, then the score
  function krDraw(box) {
    const day = gamesDay(), qs = krPick(day, fishRules), s = krLoad(day);
    const head = el("div", "games-head");
    const back = el("button", "games-back", "‹ Games"); back.type = "button"; back.setAttribute("aria-label", "Back to Games");
    back.addEventListener("click", () => { gamesScreen = "list"; renderGames(); window.scrollTo({ top: 0 }); });
    head.appendChild(back);
    head.appendChild(el("h2", "games-title", "Keeper or release?"));
    box.appendChild(head);
    if (!qs.length) { box.appendChild(el("div", "spot-meta", "The size rules are still loading. Try again in a moment.")); return; }
    const at = Math.min(s.picks.length, qs.length);
    const bar = el("div", "kr-bar"); bar.setAttribute("aria-hidden", "true");
    qs.forEach((q, i) => bar.appendChild(el("span", i < s.picks.length ? (s.picks[i] === q.keep ? "right" : "wrong") : "")));
    box.appendChild(bar);
    if (at >= qs.length && !box.dataset.justAnswered) return krEnd(box, qs, s);
    // the question still showing its answer (just answered) or the next one
    const showing = box.dataset.justAnswered ? +box.dataset.justAnswered - 1 : at;
    const q = qs[showing], answered = showing < s.picks.length;
    box.appendChild(el("div", "kr-count", `${showing + 1} of ${qs.length}`));
    const card = el("div", "kr-q");
    if (typeof fishSvg === "function") { const f = fishSvg(q.species, 64); f.classList && f.classList.add("kr-fish"); card.appendChild(f); }
    card.appendChild(el("div", "kr-sp", q.species));
    card.appendChild(el("div", "kr-facts", `${inch(q.len)} ${q.measure} · ${KR_MONTHS[q.when.getMonth()]} ${q.when.getDate()} · ${q.where}`));
    box.appendChild(card);
    box.appendChild(el("p", "kr-ask", "Keep it or let it go?"));
    const row = el("div", "kr-btns");
    [[true, "✅ Keep"], [false, "🔄 Release"]].forEach(([k, t]) => {
      const b = el("button", "kr-btn", t); b.type = "button"; b.dataset.keep = String(k);
      if (answered) {
        b.disabled = true;
        if (k === q.keep) b.classList.add("right");
        else if (s.picks[showing] === k) b.classList.add("wrong");
      } else b.addEventListener("click", () => {
        s.picks.push(k); krSave(s);
        box.dataset.justAnswered = String(showing + 1); renderGames();
      });
      row.appendChild(b);
    });
    box.appendChild(row);
    if (answered) {
      const right = s.picks[showing] === q.keep;
      const res = el("div", "kr-why " + (right ? "right" : "wrong")); res.setAttribute("role", "status");
      res.appendChild(el("b", null, right ? "Right! " : `Not quite — ${q.keep ? "keep" : "release"}. `));
      res.appendChild(document.createTextNode(q.why));
      box.appendChild(res);
      const next = el("button", "btn kr-next", showing + 1 >= qs.length ? "See my score" : "Next question"); next.type = "button";
      next.addEventListener("click", () => { delete box.dataset.justAnswered; renderGames(); });
      box.appendChild(next);
      setTimeout(() => { try { next.focus({ preventScroll: true }); } catch (e) { /* fine */ } }, 0);
    }
    box.appendChild(el("div", "spot-meta kr-fresh", `A guide only. ${krFresh(q.rule)}`));
  }
  function krEnd(box, qs, s) {
    const n = krScore(qs, s);
    const end = el("div", "kr-end"); end.setAttribute("role", "status");
    end.appendChild(el("div", "kr-score", `${n}/${qs.length}`));
    end.appendChild(el("div", "kr-msg", n === qs.length ? "Perfect! You know your size rules. 🎣" : n >= 3 ? "Nice work! A few more rules to brush up on." : "Good try — the rules are tricky. Check them before your next trip."));
    end.appendChild(el("div", "spot-meta", "Everyone gets the same 5 today, so you can compare with friends. New questions tomorrow."));
    box.appendChild(end);
    const list = el("ol", "kr-review");
    qs.forEach((q, i) => {
      const li = el("li", s.picks[i] === q.keep ? "right" : "wrong");
      li.appendChild(el("b", null, `${s.picks[i] === q.keep ? "✓" : "✗"} ${q.species}, ${inch(q.len)}, ${KR_MONTHS[q.when.getMonth()]} ${q.when.getDate()}: ${q.keep ? "Keep" : "Release"}`));
      li.appendChild(el("div", "spot-meta", q.why));
      list.appendChild(li);
    });
    box.appendChild(list);
    const stale = qs.filter(q => ruleStale(q.rule));
    box.appendChild(el("div", "spot-meta kr-fresh", stale.length ? `A guide only. ⚠️ ${stale.map(q => q.species).join(", ")}: last checked a while ago — the rules may have changed, so confirm with FWC.` : "A guide only. Always check the current FWC rules before you keep a fish."));
    const back = el("button", "btn ghost", "‹ Back to Games"); back.type = "button";
    back.addEventListener("click", () => { gamesScreen = "list"; renderGames(); window.scrollTo({ top: 0 }); });
    box.appendChild(back);
  }
  // The race screen gets a way back to the Games list
  (function gamesRaceBack() {
    const b = $("race-back"); if (b) b.addEventListener("click", () => { gamesScreen = "list"; showPlay("games"); window.scrollTo({ top: 0 }); });
  })();
