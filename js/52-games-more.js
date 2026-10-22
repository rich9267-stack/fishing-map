  // ---- 🎮 More games (Games plan, rest of the list): Guess the fish, How long is it?, Fishing bingo + the daily streak ----
  // No coins, nothing saved to the database. Photos come from members' 🌎 Public catches (the same ones the Public feed shows every approved member),
  // credited "📷 name". Only when the app has too few: Guess the fish fills in with iNaturalist photos (CC0 / CC BY / CC BY-SA, credited) and
  // How long is it? with the app's fish drawing next to a dollar bill. Bingo fills in from YOUR OWN catches and trips this month.
  // Today's answers and the streak are kept on this phone only (like Keeper or release?).
  const G_N = 5;
  const gKey = name => "fm-" + name + "-" + (me ? me.id : "");
  function gLoad(name, day, empty) { try { const s = JSON.parse(localStorage.getItem(gKey(name)) || "null"); if (s && s.day === day) return s; } catch (e) { /* none */ } return Object.assign({ day }, empty); }
  function gSave(name, s) { try { localStorage.setItem(gKey(name), JSON.stringify(s)); } catch (e) { /* private mode: just this visit */ } }
  const gBack = box => {
    const back = el("button", "games-back", "‹ Games"); back.type = "button"; back.setAttribute("aria-label", "Back to Games");
    back.addEventListener("click", () => { gamesScreen = "list"; renderGames(); window.scrollTo({ top: 0 }); });
    return back;
  };
  function gHead(box, title) { const head = el("div", "games-head"); head.appendChild(gBack(box)); head.appendChild(el("h2", "games-title", title)); box.appendChild(head); }
  function gBar(box, n, marks) { const bar = el("div", "kr-bar"); bar.setAttribute("aria-hidden", "true"); for (let i = 0; i < n; i++) bar.appendChild(el("span", marks[i] || "")); box.appendChild(bar); }
  function gNext(box, last, label) {
    const next = el("button", "btn kr-next", last ? "See my score" : (label || "Next question")); next.type = "button";
    next.addEventListener("click", () => { delete box.dataset.justAnswered; renderGames(); });
    box.appendChild(next);
    setTimeout(() => { try { next.focus({ preventScroll: true }); } catch (e) { /* fine */ } }, 0);
  }
  function gEndBack(box) { const back = el("button", "btn ghost", "‹ Back to Games"); back.type = "button"; back.addEventListener("click", () => { gamesScreen = "list"; renderGames(); window.scrollTo({ top: 0 }); }); box.appendChild(back); }

  // ---- 📸 Members' public photos: 🌎 Public catches that have a photo (what the Public feed already shows every approved member) ----
  // Loaded once a day and kept on this phone for the day. Only catches from before today count, so everyone gets the same pool all day.
  // Blocked people's photos are left out; photos an admin hid are already left out by the database.
  let gpPool = null, gpBusy = false;   // { day, list: [{ id, species, len, path, by }], failed }
  const GP_KEY = "fm-games-pool";
  const gpReady = () => !!(gpPool && gpPool.day === gamesDay());
  const gpList = () => gpReady() ? gpPool.list : [];
  async function gpLoad() {
    const day = gamesDay();
    if (gpReady() || gpBusy) return;
    try { const c = JSON.parse(localStorage.getItem(GP_KEY) || "null"); if (c && c.day === day && Array.isArray(c.list)) { gpPool = c; if (playSub === "games") renderGames(); return; } } catch (e) { /* none */ }
    if (!me || typeof db === "undefined" || !db) return;
    gpBusy = true;
    try {
      const { data, error } = await db.from("catches").select("id,species,length_in,created_by,caught_at").eq("visibility", "public").is("deleted_at", null).order("caught_at", { ascending: false }).limit(400);
      if (error) throw error;
      const blocked = typeof blockedIds !== "undefined" ? blockedIds : new Set();
      const cs = (data || []).filter(c => c.species && String(c.species).trim() && c.caught_at && gamesDay(new Date(c.caught_at)) < day && !blocked.has(c.created_by));
      let ph = [];
      if (cs.length) { const r = await db.from("photos").select("catch_id,path,created_at").in("catch_id", cs.map(c => c.id)); if (r.error) throw r.error; ph = r.data || []; }
      const first = {};
      ph.slice().sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || ""))).forEach(x => { if (x.path && !first[x.catch_id]) first[x.catch_id] = x.path; });
      const keep = cs.filter(c => first[c.id]);
      if (typeof ensureProfiles === "function") { try { await ensureProfiles(keep.map(c => c.created_by)); } catch (e) { /* names are optional */ } }
      const list = keep.map(c => ({ id: c.id, species: String(c.species).trim(), len: c.length_in != null && +c.length_in > 0 ? +c.length_in : null, path: first[c.id],
        by: (typeof profName === "function" && profName(c.created_by)) || "a member" })).sort((a, b) => String(a.id).localeCompare(String(b.id)));
      gpPool = { day, list };
      try { localStorage.setItem(GP_KEY, JSON.stringify(gpPool)); } catch (e) { /* storage full */ }
    } catch (e) { gpPool = { day, list: [], failed: true }; }
    gpBusy = false;
    if (playSub === "games") renderGames();
  }
  // A member's photo with "📷 name" under it (the link is signed when needed, like the Public feed)
  function gpFigure(p, note) {
    const fig = el("figure", "gf-pic");
    const img = el("img"); img.alt = "A member's catch"; img.decoding = "async";
    const show = () => { if (photoUrls[p.path]) img.src = photoUrls[p.path]; };
    show();
    if (!photoUrls[p.path] && typeof db !== "undefined" && db) db.storage.from("photos").createSignedUrls([p.path], 3600).then(({ data }) => { (data || []).forEach(l => { if (l.signedUrl) photoUrls[l.path] = l.signedUrl; }); show(); }).catch(() => {});
    fig.appendChild(img);
    fig.appendChild(el("figcaption", "gf-credit", "📷 " + p.by + (note ? " · " + note : "")));
    return fig;
  }
  function gLoading(box, msg) { box.appendChild(el("div", "spot-meta", msg || "Getting today's photos…")); gpLoad(); }

  // ---- 🔥 Daily streak: days in a row you finished at least one daily game (Keeper or release?, Guess the fish, How long is it?) ----
  const gDaysKey = () => gKey("games-days");
  function gamesDaysDone() { try { const a = JSON.parse(localStorage.getItem(gDaysKey()) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function gamesMarkDone(day) {
    const a = gamesDaysDone(); if (a.includes(day)) return;
    a.push(day); a.sort();
    try { localStorage.setItem(gDaysKey(), JSON.stringify(a.slice(-400))); } catch (e) { /* fine */ }
  }
  const gPrevDay = day => { const d = new Date(day + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); };
  // Counts back from today (or from yesterday, if today isn't done yet, so the streak doesn't look lost in the morning)
  function gamesStreak(today, days) {
    const set = new Set(days || gamesDaysDone()); today = today || gamesDay();
    let d = set.has(today) ? today : gPrevDay(today), n = 0;
    while (set.has(d)) { n++; d = gPrevDay(d); }
    return { n, today: set.has(today) };
  }
  function gamesStreakBox() {
    const s = gamesStreak(), b = el("div", "games-streak" + (s.n ? " on" : ""));
    b.setAttribute("role", "status");
    b.appendChild(el("span", "games-streak-ic", s.n ? "🔥" : "✨"));
    const t = el("span", "games-streak-txt");
    t.appendChild(el("b", null, s.n ? `${s.n}-day streak` : "Start a streak"));
    t.appendChild(el("span", null, s.today ? "Done for today. Come back tomorrow!" : s.n ? "Finish any daily game today to keep it going." : "Finish any daily game today."));
    b.appendChild(t); return b;
  }

  // ---- 🔍 Guess the fish: 5 photos a day (members' public catches first), pick the right name from 4 ----
  const GF_LICENCES = ["cc0", "cc-by", "cc-by-sa"];
  const GF_URL = "https://api.inaturalist.org/v1/observations?taxon_id=47178&place_id=21&quality_grade=research&photos=true" +
    "&photo_license=" + GF_LICENCES.join(",") + "&order_by=votes&per_page=200";
  // US plan step 7: outside Florida the fish are that region's Seasons cards (seasonList, js/05) and iNaturalist is asked for US photos,
  // the ones near the place on screen first (GF_NEAR_KM), then the rest of the country. In Florida nothing changes.
  const GF_US_URL = "https://api.inaturalist.org/v1/observations?taxon_id=47178&place_id=1&quality_grade=research&photos=true" +
    "&photo_license=" + GF_LICENCES.join(",") + "&order_by=votes&per_page=200";
  const GF_NEAR_KM = 400;
  let gfPhotos = null, gfBusy = false, gfErr = null, gfAt = null;   // gfPhotos = [{ id, name (ours), inat, photo, credit, url, near }]; gfAt = whose photos they are
  // Where the games are: Florida (null) or { state, lat, lng } for the place on screen outside Florida
  function gfWhere() {
    const i = typeof rulesInfo === "function" ? rulesInfo() : null;
    if (!i || !i.outside || !i.state) return null;
    const a = typeof area !== "undefined" ? area : null;
    return { state: i.state, lat: +(a ? a.lat : LAT), lng: +(a ? a.lng : LNG) };
  }
  const gfAtKey = w => w ? w.state : "FL";
  const gfFish = () => (typeof seasonList === "function" ? seasonList() : SEASONS).filter(f => !f.far && !/\brun\b/i.test(f.name));
  // An iNaturalist observation → one of our Seasons fish (or null); only photos whose own licence allows reuse
  function gfFromObs(o) {
    const nm = o && o.taxon && (o.taxon.preferred_common_name || o.taxon.name); if (!nm) return null;
    const f = seasonFor(nm); if (!f || f.far || /\brun\b/i.test(f.name)) return null;
    const ph = (o.photos || []).find(p => p && p.url && GF_LICENCES.includes(String(p.license_code || "").toLowerCase()));
    if (!ph) return null;
    return { id: o.id, name: f.name, inat: cap(nm), photo: ph.url.replace("/square.", "/medium."), credit: ph.attribution || "iNaturalist user", url: o.uri || `https://www.inaturalist.org/observations/${o.id}` };
  }
  async function gfLoad(force) {
    const day = gamesDay(), w = gfWhere(), at = gfAtKey(w);
    if (!force) { try { const c = JSON.parse(localStorage.getItem("fm-guess-photos") || "null"); if (c && c.day === day && (c.at || "FL") === at && Array.isArray(c.list) && c.list.length) { gfPhotos = c.list; gfAt = at; if (playSub === "games" && (gamesScreen === "guess" || gamesScreen === "list")) renderGames(); return; } } catch (e) { /* none */ } }
    if (gfBusy) return; gfBusy = true; gfErr = null;
    try {
      const ask = async url => { const res = await fetch(url); if (!res.ok) throw new Error("iNaturalist answered " + res.status); return (await res.json()).results || []; };
      if (!w) gfPhotos = (await ask(GF_URL)).map(gfFromObs).filter(Boolean).sort((a, b) => a.id - b.id);
      else {
        // near you first; the whole country only fills in when the nearby photos cover fewer than 5 kinds of fish
        const near = (await ask(`${GF_US_URL}&lat=${w.lat.toFixed(2)}&lng=${w.lng.toFixed(2)}&radius=${GF_NEAR_KM}`)).map(gfFromObs).filter(Boolean).map(p => Object.assign(p, { near: true }));
        let far = [];
        if (new Set(near.map(p => p.name)).size < G_N) { try { far = (await ask(GF_US_URL)).map(gfFromObs).filter(Boolean).filter(p => !near.some(n => n.id === p.id)).map(p => Object.assign(p, { near: false })); } catch (e) { if (!near.length) throw e; } }
        gfPhotos = near.concat(far).sort((a, b) => a.id - b.id);
      }
      gfAt = at;
      if (!gfPhotos.length) throw new Error("no photos");
      try { localStorage.setItem("fm-guess-photos", JSON.stringify(w ? { day, at, list: gfPhotos } : { day, list: gfPhotos })); } catch (e) { /* storage full */ }
    } catch (e) { gfErr = "Couldn't load today's photos. Check your connection and try again."; if (!gfPhotos || !gfPhotos.length) gfPhotos = null; }
    gfBusy = false;
    if (playSub === "games" && (gamesScreen === "guess" || gamesScreen === "list")) renderGames();
  }
  // Today's 5: 5 different fish, each with 3 wrong names (fish from the same group first, so it's not too easy)
  function gfPick(day, photos) {
    const rand = krRand("guess-" + day), fish = gfFish(), out = [], used = new Set();
    const pool = (photos || []).slice().sort((a, b) => String(a.id).localeCompare(String(b.id)));
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    pool.sort((a, b) => (b.app ? 1 : 0) - (a.app ? 1 : 0) || (b.near ? 1 : 0) - (a.near ? 1 : 0));   // members' photos first; iNaturalist only fills a gap (near you before far away)
    for (const p of pool) {
      if (out.length >= G_N) break;
      if (used.has(p.name)) continue;
      const f = fish.find(x => x.name === p.name); if (!f) continue;
      used.add(p.name);
      const same = fish.filter(x => x !== f && x.group === f.group), other = fish.filter(x => x !== f && x.group !== f.group);
      const take = (list, n) => { const a = list.slice(), r = []; while (a.length && r.length < n) r.push(a.splice(Math.floor(rand() * a.length), 1)[0].name); return r; };
      const wrong = take(same, 2); wrong.push(...take(other.concat(same.filter(x => !wrong.includes(x.name))), 3 - wrong.length));
      const choices = [p.name, ...wrong];
      for (let i = choices.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [choices[i], choices[j]] = [choices[j], choices[i]]; }
      out.push(Object.assign({}, p, { choices, tip: f.tip || "" }));
    }
    return out;
  }
  const gfScore = (qs, s) => s.picks.filter((p, i) => qs[i] && p === qs[i].name).length;
  // Members' public photos of fish the app knows (one of the Seasons fish)
  const gfApp = () => gpList().map(p => { const f = seasonFor(p.species); return f && !f.far && !/\brun\b/i.test(f.name) ? { id: "m" + p.id, name: f.name, inat: cap(p.species), app: true, path: p.path, by: p.by } : null; }).filter(Boolean);
  // Today's questions: fixed once you answer the first one (kept with your answers), so they never change halfway through.
  // null = still loading. iNaturalist is only asked when members' photos cover fewer than 5 kinds of fish.
  function gfToday() {
    const day = gamesDay(), s = gLoad("guess", day, { picks: [] });
    if (Array.isArray(s.qs) && s.qs.length) return s.qs;
    if (!gpReady()) { gpLoad(); return null; }
    const app = gfApp();
    if (new Set(app.map(x => x.name)).size >= G_N) return gfPick(day, app);
    if (gfAt !== null && gfAt !== gfAtKey(gfWhere())) { gfPhotos = null; gfErr = null; gfAt = null; }   // the place on screen moved to another state
    if (!gfPhotos && !gfErr) { gfLoad(); return null; }
    return gfPick(day, app.concat(gfPhotos || []));
  }
  function gfStatus() {
    const s = gLoad("guess", gamesDay(), { picks: [] }), qs = gfToday();
    if (!qs) return "Loading…";
    if (!qs.length) return "Needs internet";
    return s.picks.length >= qs.length ? `Done · ${gfScore(qs, s)}/${qs.length}` : s.picks.length ? `${s.picks.length} of ${qs.length} done` : `Today's ${qs.length} ready`;
  }
  function gfDraw(box) {
    gHead(box, "Guess the fish");
    const day = gamesDay(), qs = gfToday(), s = gLoad("guess", day, { picks: [] });
    if (!qs) return gLoading(box);
    if (!qs.length) {
      box.appendChild(el("div", "spot-meta", gfErr || "No photos today. Try again later."));
      const again = el("button", "btn", "Try again"); again.type = "button";
      again.addEventListener("click", () => { gfErr = null; if (gpPool && gpPool.failed) { gpPool = null; try { localStorage.removeItem(GP_KEY); } catch (e) { /* fine */ } } renderGames(); gfLoad(true); });
      box.appendChild(again); return;
    }
    gBar(box, qs.length, qs.map((q, i) => i < s.picks.length ? (s.picks[i] === q.name ? "right" : "wrong") : ""));
    const at = Math.min(s.picks.length, qs.length);
    if (at >= qs.length && !box.dataset.justAnswered) return gfEnd(box, qs, s);
    const showing = box.dataset.justAnswered ? +box.dataset.justAnswered - 1 : at, q = qs[showing], answered = showing < s.picks.length;
    box.appendChild(el("div", "kr-count", `${showing + 1} of ${qs.length}`));
    if (q.app) box.appendChild(gpFigure(q));
    else {
      const fig = el("figure", "gf-pic");
      const img = el("img"); img.src = q.photo; img.alt = "A fish to name"; img.loading = "eager"; img.decoding = "async"; img.referrerPolicy = "no-referrer";
      fig.appendChild(img);
      const cr = el("figcaption", "gf-credit"); const a = el("a", null, `📷 ${q.credit} · iNaturalist`); a.href = q.url; a.target = "_blank"; a.rel = "noopener"; cr.appendChild(a); fig.appendChild(cr);
      box.appendChild(fig);
    }
    box.appendChild(el("p", "kr-ask", "What fish is this?"));
    const grid = el("div", "gf-btns");
    q.choices.forEach(name => {
      const b = el("button", "kr-btn gf-btn", name); b.type = "button"; b.dataset.name = name;
      if (answered) { b.disabled = true; if (name === q.name) b.classList.add("right"); else if (s.picks[showing] === name) b.classList.add("wrong"); }
      else b.addEventListener("click", () => {
        if (!s.qs) s.qs = qs;
        s.picks.push(name); gSave("guess", s); if (s.picks.length >= qs.length) gamesMarkDone(day);
        box.dataset.justAnswered = String(showing + 1); renderGames();
      });
      grid.appendChild(b);
    });
    box.appendChild(grid);
    if (answered) {
      const right = s.picks[showing] === q.name;
      const res = el("div", "kr-why " + (right ? "right" : "wrong")); res.setAttribute("role", "status");
      res.appendChild(el("b", null, right ? "Right! " : `Not quite — the answer is ${q.name}. `));
      res.appendChild(document.createTextNode(q.inat.toLowerCase() === q.name.toLowerCase() ? "" : q.app ? `(Logged as ${q.inat}.)` : `(iNaturalist calls it ${q.inat}.)`));
      if (q.tip) res.appendChild(el("div", "spot-meta", "Tip: " + q.tip));
      box.appendChild(res);
      gNext(box, showing + 1 >= qs.length);
    }
  }
  function gfEnd(box, qs, s) {
    const n = gfScore(qs, s), end = el("div", "kr-end"); end.setAttribute("role", "status");
    end.appendChild(el("div", "kr-score", `${n}/${qs.length}`));
    end.appendChild(el("div", "kr-msg", n === qs.length ? "Perfect! Sharp eyes. 🎣" : n >= 3 ? "Nice work!" : "Good try. Some of these look a lot alike!"));
    end.appendChild(el("div", "spot-meta", "New photos tomorrow."));
    box.appendChild(end);
    const list = el("ol", "kr-review");
    qs.forEach((q, i) => {
      const li = el("li", s.picks[i] === q.name ? "right" : "wrong");
      li.appendChild(el("b", null, `${s.picks[i] === q.name ? "✓" : "✗"} ${q.name}`));
      li.appendChild(el("div", "spot-meta", s.picks[i] === q.name ? "You got it." : `You said ${s.picks[i]}.`));
      list.appendChild(li);
    });
    box.appendChild(list);
    box.appendChild(el("div", "spot-meta kr-fresh", qs.every(q => q.app) ? "Photos: members' 🌎 Public catches." : qs.some(q => q.near !== undefined) ? "Photos: members' 🌎 Public catches, plus research-grade iNaturalist sightings in the United States (near you first) shared under open licences." : "Photos: members' 🌎 Public catches, plus research-grade iNaturalist sightings in Florida shared under open licences."));
    gEndBack(box);
  }

  // ---- 📏 How long is it?: members' public photos of measured catches — guess the length the angler measured; the closer, the more points ----
  // When the app has fewer than 5 measured public photos, the rest are the app's fish drawing next to a dollar bill (6.1″ long).
  const GL_BILL = 6.14, GL_MIN = 4, GL_MAX = 60;
  const glPts = off => off <= 1 ? 3 : off <= 3 ? 2 : off <= 6 ? 1 : 0;
  const GL_WORD = ["Way off", "Not bad", "Close!", "Spot on!"];
  // A believable length for this fish: around its legal size if the app has a rule for it, else a usual size for its group
  const GL_GROUP = { fresh: [6, 20], beach: [8, 24], inshore: [12, 34], offshore: [18, 46] };
  function glRange(f) {
    const r = typeof ruleFor === "function" ? ruleFor(f.match[0] || f.name) : null;
    let [lo, hi] = GL_GROUP[f.group] || [10, 30];
    if (r && r.min_in != null) { lo = r.min_in * 0.7; hi = r.max_in != null ? r.max_in * 1.15 : r.min_in * 1.7; }
    else if (r && r.max_in != null) { lo = r.max_in * 0.5; hi = r.max_in * 1.1; }
    return [Math.max(GL_MIN + 2, lo), Math.min(GL_MAX - 6, Math.max(hi, lo + 6))];
  }
  function glPick(day, pool) {
    const rand = krRand("length-" + day), fish = gfFish().slice().sort((a, b) => a.name.localeCompare(b.name)), out = [];
    // members' measured catches first: different kinds of fish before a second of the same kind
    const ph = (pool || []).filter(p => p.len != null && p.len >= GL_MIN && p.len <= GL_MAX);
    for (let i = ph.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [ph[i], ph[j]] = [ph[j], ph[i]]; }
    const nameOf = p => { const f = seasonFor(p.species); return f && !/\brun\b/i.test(f.name) ? f.name : cap(p.species); };
    const seen = new Set();
    [ph.filter(p => !seen.has(nameOf(p)) && seen.add(nameOf(p))), ph].forEach(list => list.forEach(p => {
      if (out.length < G_N && !out.some(q => q.id === p.id)) out.push({ id: p.id, name: nameOf(p), len: Math.round(p.len * 2) / 2, app: true, path: p.path, by: p.by });
    }));
    while (out.length < G_N && fish.length) {
      const f = fish.splice(Math.floor(rand() * fish.length), 1)[0], [lo, hi] = glRange(f);
      out.push({ name: f.name, len: Math.round((lo + rand() * (hi - lo)) * 2) / 2 });
    }
    return out;
  }
  const glScore = (qs, s) => s.guesses.reduce((n, g, i) => n + (qs[i] ? glPts(Math.abs(g - qs[i].len)) : 0), 0);
  function glToday() {
    const day = gamesDay(), s = gLoad("length", day, { guesses: [] });
    if (Array.isArray(s.qs) && s.qs.length) return s.qs;
    if (!gpReady()) { gpLoad(); return null; }
    return glPick(day, gpList());
  }
  function glStatus() {
    const qs = glToday(), s = gLoad("length", gamesDay(), { guesses: [] });
    if (!qs) return "Loading…";
    return s.guesses.length >= qs.length ? `Done · ${glScore(qs, s)}/${qs.length * 3}` : s.guesses.length ? `${s.guesses.length} of ${qs.length} done` : `Today's ${qs.length} ready`;
  }
  // The picture: fish and bill drawn to the same scale (as shares of the picture's width, so it stays right on any phone), so the bill is the only clue
  function glScene(q) {
    const wrap = el("div", "gl-scene"), W = 300, scale = Math.min(10, (W - 16) / Math.max(q.len, GL_BILL + 2)), pct = px => (100 * px / W).toFixed(2) + "%";
    const fish = fishSvg(q.name, Math.round(q.len * scale * 128 / 115)); fish.classList.add("gl-fish"); fish.setAttribute("aria-hidden", "true");
    fish.style.width = pct(q.len * scale * 128 / 115); fish.removeAttribute("height"); wrap.appendChild(fish);
    const bill = el("div", "gl-bill", "$1"); bill.style.width = pct(GL_BILL * scale);
    bill.setAttribute("aria-hidden", "true"); wrap.appendChild(bill);
    wrap.appendChild(el("div", "spot-meta gl-hint", "The dollar bill is 6.1″ long."));
    return wrap;
  }
  function glDraw(box) {
    gHead(box, "How long is it?");
    const day = gamesDay(), qs = glToday(), s = gLoad("length", day, { guesses: [] });
    if (!qs) return gLoading(box);
    gBar(box, qs.length, qs.map((q, i) => i < s.guesses.length ? (glPts(Math.abs(s.guesses[i] - q.len)) >= 2 ? "right" : "wrong") : ""));
    const at = Math.min(s.guesses.length, qs.length);
    if (at >= qs.length && !box.dataset.justAnswered) return glEnd(box, qs, s);
    const showing = box.dataset.justAnswered ? +box.dataset.justAnswered - 1 : at, q = qs[showing], answered = showing < s.guesses.length;
    box.appendChild(el("div", "kr-count", `${showing + 1} of ${qs.length}`));
    const card = el("div", "kr-q"); card.appendChild(el("div", "kr-sp", q.name));
    card.appendChild(q.app ? gpFigure(q, "measured by the angler") : glScene(q)); box.appendChild(card);
    box.appendChild(el("p", "kr-ask", "How long is this fish?"));
    let v = answered ? s.guesses[showing] : 20;
    const big = el("div", "gl-val", inch(v)); big.setAttribute("aria-live", "polite");
    const row = el("div", "gl-row");
    const minus = el("button", "gl-step", "−"), plus = el("button", "gl-step", "+");
    minus.type = plus.type = "button"; minus.setAttribute("aria-label", "Half an inch shorter"); plus.setAttribute("aria-label", "Half an inch longer");
    const slider = el("input", "gl-slider"); slider.type = "range"; slider.min = GL_MIN; slider.max = GL_MAX; slider.step = "0.5"; slider.value = v; slider.setAttribute("aria-label", "Your guess in inches");
    const set = n => { v = Math.max(GL_MIN, Math.min(GL_MAX, Math.round(n * 2) / 2)); slider.value = v; big.textContent = inch(v); };
    minus.addEventListener("click", () => set(v - 0.5)); plus.addEventListener("click", () => set(v + 0.5));
    slider.addEventListener("input", () => set(+slider.value));
    row.appendChild(minus); row.appendChild(slider); row.appendChild(plus);
    box.appendChild(big); box.appendChild(row);
    if (answered) {
      [minus, plus, slider].forEach(x => x.disabled = true);
      const off = Math.abs(s.guesses[showing] - q.len), pts = glPts(off);
      const res = el("div", "kr-why " + (pts >= 2 ? "right" : "wrong")); res.setAttribute("role", "status");
      res.appendChild(el("b", null, `${GL_WORD[pts]} `));
      res.appendChild(document.createTextNode(`It's ${inch(q.len)}${q.app ? ` (measured by ${q.by})` : ""}. You said ${inch(s.guesses[showing])} (${off ? inch(off) + " off" : "exactly right"}) · +${pts} point${pts === 1 ? "" : "s"}.`));
      box.appendChild(res);
      gNext(box, showing + 1 >= qs.length);
    } else {
      const lock = el("button", "btn kr-next gl-lock", "Lock in my guess"); lock.type = "button";
      lock.addEventListener("click", () => {
        if (!s.qs) s.qs = qs;
        s.guesses.push(v); gSave("length", s); if (s.guesses.length >= qs.length) gamesMarkDone(day);
        box.dataset.justAnswered = String(showing + 1); renderGames();
      });
      box.appendChild(lock);
    }
    box.appendChild(el("div", "spot-meta kr-fresh", "Points: 3 within 1″ · 2 within 3″ · 1 within 6″. Practice for sizing up a fish before you measure it." + (q.app ? " Photos: members' 🌎 Public catches." : "")));
  }
  function glEnd(box, qs, s) {
    const n = glScore(qs, s), max = qs.length * 3, end = el("div", "kr-end"); end.setAttribute("role", "status");
    end.appendChild(el("div", "kr-score", `${n}/${max}`));
    end.appendChild(el("div", "kr-msg", n >= max - 2 ? "Great eye for size! 📏" : n >= max / 2 ? "Nice guessing!" : "Tricky! Always measure before you keep a fish."));
    end.appendChild(el("div", "spot-meta", "Everyone gets the same 5 today. New fish tomorrow."));
    box.appendChild(end);
    const list = el("ol", "kr-review");
    qs.forEach((q, i) => {
      const pts = glPts(Math.abs(s.guesses[i] - q.len)), li = el("li", pts >= 2 ? "right" : "wrong");
      li.appendChild(el("b", null, `${q.name}: ${inch(q.len)}`));
      li.appendChild(el("div", "spot-meta", `You said ${inch(s.guesses[i])} · +${pts}`));
      list.appendChild(li);
    });
    box.appendChild(list);
    gEndBack(box);
  }

  // ---- 🎲 Fishing bingo: a 3×3 card each month (the same for everyone), filled in by your own catches and trips this month ----
  const nyHour = d => { try { return +new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" }).format(d); } catch (e) { return d.getHours(); } };
  const nyWeekday = d => { try { return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short" }).format(d); } catch (e) { return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()]; } };
  // Each square: label + a test on { catches, trips } (this month only). "n" = how many fish a catch row counts as.
  const BG_TASKS = [
    { id: "trip", icon: "🗺️", label: "Log a trip", ok: x => x.trips.length > 0 },
    { id: "dawn", icon: "🌅", label: "Fish before 8 am", ok: x => x.catches.some(c => { const h = nyHour(new Date(c.caught_at)); return h >= 4 && h < 8; }) || x.trips.some(t => { const h = nyHour(new Date(t.started_at)); return h >= 4 && h < 8; }) },
    { id: "night", icon: "🌙", label: "Catch one after dark", ok: x => x.catches.some(c => { const h = nyHour(new Date(c.caught_at)); return h >= 20 || h < 4; }) },
    { id: "three", icon: "🐟", label: "3 fish in one day", ok: x => Object.values(bgByDay(x.catches)).some(l => l.reduce((n, c) => n + (c.how_many || 1), 0) >= 3) },
    { id: "two-sp", icon: "🎏", label: "2 kinds in one day", ok: x => Object.values(bgByDay(x.catches)).some(l => new Set(l.map(c => String(c.species || "").toLowerCase())).size >= 2) },
    { id: "big", icon: "💪", label: "One over 20″", ok: x => x.catches.some(c => c.length_in != null && +c.length_in > 20) },
    { id: "spots", icon: "📍", label: "Fish 2 different spots", ok: x => new Set(x.catches.map(c => c.spot_id).concat(x.trips.map(t => t.spot_id)).filter(Boolean)).size >= 2 },
    { id: "weekend", icon: "🏖️", label: "Catch one on a weekend", ok: x => x.catches.some(c => /Sat|Sun/.test(nyWeekday(new Date(c.caught_at)))) },
    { id: "measure", icon: "📏", label: "Measure a catch", ok: x => x.catches.some(c => c.length_in != null) },
    { id: "five", icon: "🖐️", label: "5 fish this month", ok: x => x.catches.reduce((n, c) => n + (c.how_many || 1), 0) >= 5 }
  ];
  const bgByDay = cs => { const o = {}; cs.forEach(c => { const k = gamesDay(new Date(c.caught_at)); (o[k] = o[k] || []).push(c); }); return o; };
  const BG_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  // The month's card: 3 fish in season from shore this month + 5 tasks, shuffled, FREE in the middle
  function bgCard(month) {
    const rand = krRand("bingo-" + month), m = +month.slice(5, 7) - 1;
    const out = !!gfWhere();   // outside Florida: the region's cards (gfFish), freshwater fish too (most of the country fishes lakes and rivers)
    const fish = gfFish().filter(f => (out || f.group !== "fresh") && f.shore && f.shore[m] >= 2).sort((a, b) => a.name.localeCompare(b.name));
    const take = (list, n) => { const a = list.slice(), r = []; while (a.length && r.length < n) r.push(a.splice(Math.floor(rand() * a.length), 1)[0]); return r; };
    const fishSq = take(fish, 3).map(f => ({ id: "fish:" + f.name, icon: "🎣", label: "Catch " + f.name.replace(/\s*\(.*\)$/, ""), ok: x => x.catches.some(c => seasonFor(c.species) === f) }));
    const sq = take(BG_TASKS, 8 - fishSq.length).concat(fishSq);
    for (let i = sq.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [sq[i], sq[j]] = [sq[j], sq[i]]; }
    sq.splice(4, 0, { id: "free", icon: "⭐", label: "Free", ok: () => true });
    return sq;
  }
  // Your own catches and finished trips in this New York month
  function bgMine(month) {
    const inMonth = t => t && gamesDay(new Date(t)).slice(0, 7) === month;
    return { catches: (typeof myCatches === "function" ? myCatches() : []).filter(c => inMonth(c.caught_at)),
      trips: (typeof myTrips === "function" ? myTrips() : []).filter(t => inMonth(t.started_at)) };
  }
  function bgState(month) {
    const card = bgCard(month), x = bgMine(month), done = card.map(s => { try { return !!s.ok(x); } catch (e) { return false; } });
    const lines = BG_LINES.filter(l => l.every(i => done[i])).length;
    return { card, done, lines, n: done.filter(Boolean).length };
  }
  function bgStatus() { const st = bgState(gamesDay().slice(0, 7)); return st.n >= 9 ? "Full card! 🎉" : st.lines ? `BINGO ×${st.lines} · ${st.n}/9` : `${st.n} of 9`; }
  function bgDraw(box) {
    gHead(box, "Fishing bingo");
    const month = gamesDay().slice(0, 7), st = bgState(month), mName = KR_MONTHS[+month.slice(5, 7) - 1];
    box.appendChild(el("div", "spot-meta games-sub", `${mName}'s card. Squares fill in by themselves from the catches and trips you log this month. Get 3 in a row!`));
    const grid = el("div", "bg-grid"); grid.setAttribute("role", "list");
    const inLine = new Set(BG_LINES.filter(l => l.every(i => st.done[i])).flat());
    st.card.forEach((s, i) => {
      const c = el("div", "bg-sq" + (st.done[i] ? " on" : "") + (inLine.has(i) ? " line" : "") + (s.id === "free" ? " free" : "")); c.setAttribute("role", "listitem"); c.dataset.sq = s.id;
      c.appendChild(el("span", "bg-ic", st.done[i] && s.id !== "free" ? "✅" : s.icon));
      c.appendChild(el("span", "bg-lbl", s.label));
      c.setAttribute("aria-label", s.label + (st.done[i] ? " — done" : ""));
      grid.appendChild(c);
    });
    box.appendChild(grid);
    const msg = el("div", "kr-why " + (st.lines ? "right" : "")); msg.setAttribute("role", "status");
    msg.appendChild(el("b", null, st.n >= 9 ? "Full card! 🎉 " : st.lines ? `BINGO! ${st.lines === 1 ? "One line" : st.lines + " lines"} done. ` : `${st.n} of 9 squares. `));
    msg.appendChild(document.createTextNode(st.n >= 9 ? "What a month of fishing." : "Log your catches and trips and the card fills itself in."));
    box.appendChild(msg);
    box.appendChild(el("div", "spot-meta kr-fresh", "A new card on the 1st of every month. Only your own catches count, and nothing is shared."));
  }
