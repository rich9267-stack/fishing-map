  // ---- Catch insights: what was going on when fish were caught ----
  const PHASE_ORDER = ["new moon", "waxing crescent", "first quarter", "waxing gibbous", "full moon", "waning gibbous", "last quarter", "waning crescent"];

  // Eight equal 3-hour blocks, so every part of the day gets the same weight
  const TIME_BLOCKS = ["12–3 AM", "3–6 AM", "6–9 AM", "9 AM–12 PM", "12–3 PM", "3–6 PM", "6–9 PM", "9 PM–12 AM"];
  function timeOfDay(d) { return TIME_BLOCKS[Math.floor(d.getHours() / 3)]; }
  const WATER_BANDS = ["Under 70°F", "70–74°F", "75–79°F", "80–84°F", "85°F+"];
  function waterBand(f) {
    if (f == null) return null;
    f = Number(f);
    return f < 70 ? WATER_BANDS[0] : f < 75 ? WATER_BANDS[1] : f < 80 ? WATER_BANDS[2] : f < 85 ? WATER_BANDS[3] : WATER_BANDS[4];
  }
  function windBand(mph) {
    if (mph == null) return null;
    return mph <= 5 ? "0–5 mph" : mph <= 10 ? "6–10 mph" : mph <= 15 ? "11–15 mph" : "16+ mph";
  }

  // Each chart: a title, how to read one catch, and (optionally) a fixed order
  const INSIGHT_CHARTS = [
    { title: "Tide stage", sub: "Saltwater & brackish catches", key: c => c.tide_stage && cap(c.tide_stage), order: ["Incoming", "High slack", "Outgoing", "Low slack"] },
    { title: "Pressure trend", sub: "Over the 3 hours before the catch", key: c => c.pressure_trend && cap(c.pressure_trend), order: ["Falling", "Steady", "Rising"] },
    { title: "Time of day", sub: "Equal 3-hour blocks · dawn and dusk usually fall in 6–9", key: c => timeOfDay(new Date(c.caught_at)), order: TIME_BLOCKS },
    { title: "Moon phase", key: c => c.moon_phase && cap(c.moon_phase), order: PHASE_ORDER.map(cap) },
    { title: "Solunar period", sub: "Major = moon overhead/underfoot · minor = moonrise/moonset", key: c => c.moon_phase ? (c.solunar ? cap(c.solunar) : "Neither") : null, order: ["Major", "Minor", "Neither"] },
    { title: "Wind speed", key: c => windBand(c.wind_mph), order: ["0–5 mph", "6–10 mph", "11–15 mph", "16+ mph"] },
    { title: "Water temperature", sub: "Saltwater & brackish catches", key: c => waterBand(c.water_temp_f), order: WATER_BANDS },
    { title: "Top baits & lures", key: c => c.bait && cap(c.bait.trim().toLowerCase()), top: 6 },
    { title: "Top species", key: c => c.species && cap(c.species.trim()), top: 6, hideWhenSpecies: true },
    { title: "Top spots", key: c => { const s = (spots || []).find(x => x.id === c.spot_id); return s ? s.name : null; }, top: 6, hideWhenSpot: true }
  ];

  function fillInsightPickers() {
    const spotSel = $("ins-spot"), spSel = $("ins-species");
    const keepSpot = spotSel.value, keepSp = spSel.value;
    spotSel.innerHTML = '<option value="">All spots</option>';
    (spots || []).forEach(s => { const o = document.createElement("option"); o.value = s.id; o.textContent = s.name; spotSel.appendChild(o); });
    const species = new Set();
    Object.values(catchesBySpot).flat().forEach(c => c.species && species.add(cap(c.species.trim())));
    spSel.innerHTML = '<option value="">All species</option>';
    [...species].sort().forEach(n => { const o = document.createElement("option"); o.value = n; o.textContent = n; spSel.appendChild(o); });
    spotSel.value = keepSpot; spSel.value = keepSp;
  }

  function insightCatches() {
    const spotId = $("ins-spot").value, sp = $("ins-species").value, mineOnly = $("ins-mine").checked;
    return Object.values(catchesBySpot).flat().filter(c =>
      (!spotId || c.spot_id === spotId) &&
      (!sp || (c.species && cap(c.species.trim()) === sp)) &&
      (!mineOnly || isMine(c)));
  }

  function barChart(def, list) {
    const counts = new Map();
    let known = 0;
    list.forEach(c => {
      const k = def.key(c);
      if (!k) return;
      counts.set(k, (counts.get(k) || 0) + (c.how_many || 1));
      known += (c.how_many || 1);
    });
    if (!known) return null;
    let rows = [...counts.entries()];
    if (def.order) rows = def.order.map(k => [k, counts.get(k) || 0]).concat(rows.filter(([k]) => !def.order.includes(k)));
    else rows.sort((a, b) => b[1] - a[1]);
    if (def.top) rows = rows.slice(0, def.top);
    const max = Math.max(...rows.map(r => r[1]));
    const card = el("div", "card chart");
    card.appendChild(el("h3", null, def.title));
    card.appendChild(el("div", "chart-sub", (def.sub ? def.sub + " · " : "") + `${known} fish with this info`));
    rows.forEach(([label, n]) => {
      const row = el("div", "bar-row" + (n === max && n > 0 ? " top" : ""));
      row.appendChild(el("div", "bar-label", label));
      const track = el("div", "bar-track"), fill = el("div", "bar-fill");
      fill.style.width = (max ? (n / max) * 100 : 0) + "%";
      if (!n) fill.style.minWidth = "0";
      track.appendChild(fill); row.appendChild(track);
      row.appendChild(el("div", "bar-val", n ? `${n} · ${Math.round(n / known * 100)}%` : "0"));
      row.title = `${label}: ${n} fish`;
      card.appendChild(row);
    });
    return card;
  }

  function tile(num, label) {
    const t = el("div", "tile");
    t.appendChild(el("div", "tile-num", String(num)));
    t.appendChild(el("div", "tile-label", label));
    return t;
  }

  // ---- More insights: bait scoreboard, best days & times heat map, and a tide graph for one spot ----
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  function heatCard(list) {
    const grid = DOW.map(() => Array(8).fill(0)); let known = 0;
    list.forEach(c => { const d = new Date(c.caught_at); if (isNaN(d)) return; const n = c.how_many || 1; grid[d.getDay()][Math.floor(d.getHours() / 3)] += n; known += n; });
    if (known < 3) return null;
    const max = Math.max(...grid.flat());
    const card = el("div", "card chart"); card.id = "ins-heat";
    card.appendChild(el("h3", null, "Best days & times"));
    card.appendChild(el("div", "chart-sub", `Darker = more fish · ${known} fish · it also shows when you go fishing`));
    const t = el("div", "heat");
    t.appendChild(el("span", "heat-h", ""));
    ["12a", "3a", "6a", "9a", "12p", "3p", "6p", "9p"].forEach(h => t.appendChild(el("span", "heat-h", h)));
    grid.forEach((row, di) => {
      t.appendChild(el("span", "heat-h", DOW[di]));
      row.forEach((n, bi) => {
        const c = el("span", "heat-c", n ? String(n) : ""); c.style.background = n ? `rgba(31,157,85,${(0.18 + 0.82 * n / max).toFixed(2)})` : "var(--line)";
        c.style.color = n / max > 0.55 ? "#fff" : "inherit"; c.title = `${DOW[di]} ${TIME_BLOCKS[bi]}: ${n} fish`; t.appendChild(c);
      });
    });
    card.appendChild(t);
    let best = null; grid.forEach((row, di) => row.forEach((n, bi) => { if (!best || n > best.n) best = { n, di, bi }; }));
    if (best && best.n) card.appendChild(el("div", "chart-sub", `Best slot so far: ${DOW[best.di]} ${TIME_BLOCKS[best.bi]} (${best.n} fish).`));
    return card;
  }
  function baitCard(list) {
    const m = new Map();
    list.forEach(c => {
      const b = c.bait && c.bait.trim().toLowerCase(); if (!b) return;
      const o = m.get(b) || { fish: 0, n: 0, lens: [], sp: new Map() };
      const k = c.how_many || 1; o.fish += k; o.n++; if (c.length_in > 0) o.lens.push(+c.length_in);
      if (c.species) { const s = cap(c.species.trim()); o.sp.set(s, (o.sp.get(s) || 0) + k); }
      m.set(b, o);
    });
    if (!m.size) return null;
    const rows = [...m.entries()].sort((a, b) => b[1].fish - a[1].fish).slice(0, 8);
    const card = el("div", "card chart"); card.id = "ins-bait";
    card.appendChild(el("h3", null, "Bait & lure scoreboard"));
    card.appendChild(el("div", "chart-sub", "What was on the line when fish came in · average length where you measured"));
    const t = el("table", "bait-table");
    const hr = el("tr"); ["Bait / lure", "Fish", "Avg size", "Mostly"].forEach(h => hr.appendChild(el("th", null, h))); t.appendChild(hr);
    rows.forEach(([b, o]) => {
      const tr = el("tr"); const top = [...o.sp.entries()].sort((a, b2) => b2[1] - a[1])[0];
      tr.appendChild(el("td", null, cap(b))); tr.appendChild(el("td", null, String(o.fish)));
      tr.appendChild(el("td", null, o.lens.length ? (o.lens.reduce((a, x) => a + x, 0) / o.lens.length).toFixed(1) + "″" : "—"));
      tr.appendChild(el("td", null, top ? top[0] : "—")); t.appendChild(tr);
    });
    card.appendChild(t);
    if (rows.length === 1) card.appendChild(el("div", "chart-sub", "Add the bait when you log catches and this fills in with comparisons."));
    return card;
  }
  let tideGraphWait = {};
  function tideCard(spotId, list) {
    const s = (spots || []).find(x => x.id === spotId); if (!s || !hasLoc(s)) return null;
    const st = stationFor(s); if (!st || !st.id) return null;
    const card = el("div", "card chart"); card.id = "ins-tide";
    card.appendChild(el("h3", null, "Tide at " + s.name));
    const p = stationTides(st.id);
    if (!p.done || p.done === "error") {
      card.appendChild(el("div", "chart-sub", p.done === "error" ? "Tide times unavailable right now." : "Loading tide…"));
      if (!p.done && !tideGraphWait[st.id]) { tideGraphWait[st.id] = true; p.then(() => { tideGraphWait[st.id] = false; renderInsights(); }, () => { tideGraphWait[st.id] = false; }); }
      return card;
    }
    const tides = p.done, now = Date.now(), H = 3600000, N = 24 * 4;
    // how much of this spot's tide-stage catches came at each stage → shade the graph
    const share = {}; let tot = 0;
    list.forEach(c => { if (c.tide_stage) { share[c.tide_stage] = (share[c.tide_stage] || 0) + (c.how_many || 1); tot += (c.how_many || 1); } });
    const mx = Math.max(0, ...Object.values(share));
    const W = 320, Ht = 130, top = 12, bot = 22, y = h => top + (1 - h) * (Ht - top - bot);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", `0 0 ${W} ${Ht}`); svg.setAttribute("class", "tide-svg");
    const mk = (tag, attrs) => { const e = document.createElementNS("http://www.w3.org/2000/svg", tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); svg.appendChild(e); return e; };
    const height = t => { const prev = [...tides].reverse().find(x => x.when <= t), next = tides.find(x => x.when > t); if (!prev || !next) return null;
      const f = (t - prev.when) / (next.when - prev.when), c = (1 - Math.cos(Math.PI * f)) / 2; return prev.high ? 1 - c : c; };
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const t = now + i * 15 * 60000, h = height(t); if (h == null) continue;
      const x = i / N * W, sg = stageFrom(tides, t); pts.push([x, y(h)]);
      if (i < N && sg && mx) { const a = 0.12 + 0.55 * ((share[sg.stage] || 0) / mx); mk("rect", { x, y: top, width: W / N + 0.5, height: Ht - top - bot, fill: `rgba(31,157,85,${a.toFixed(2)})` }); }
    }
    mk("path", { d: pts.map((q, i) => (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1)).join(" "), fill: "none", stroke: "#1d6fd6", "stroke-width": 2.5 });
    tides.filter(x => x.when > now && x.when < now + 24 * H).forEach(x => {
      const px = (x.when - now) / (24 * H) * W, py = y(x.high ? 1 : 0);
      mk("circle", { cx: px, cy: py, r: 3, fill: "#1d6fd6" });
      const tx = mk("text", { x: Math.min(Math.max(px, 18), W - 18), y: x.high ? py - 5 : py + 13, "text-anchor": "middle", "font-size": 9, fill: "currentColor" });
      tx.textContent = (x.high ? "H " : "L ") + x.when.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(" ", "").toLowerCase();
    });
    [0, 6, 12, 18, 24].forEach(h => { const tx = mk("text", { x: Math.min(Math.max(h / 24 * W, 10), W - 10), y: Ht - 6, "text-anchor": "middle", "font-size": 9, fill: "currentColor", opacity: 0.7 });
      tx.textContent = h ? new Date(now + h * H).toLocaleTimeString([], { hour: "numeric" }).replace(" ", "").toLowerCase() : "now"; });
    card.appendChild(el("div", "chart-sub", tot ? `Next 24 hours · green = the tide stages where you've caught the most here (${tot} fish with tide info)` : "Next 24 hours · log catches here and the best tide stages will light up green"));
    card.appendChild(svg);
    if (tot) { const bs = Object.entries(share).sort((a, b) => b[1] - a[1])[0]; card.appendChild(el("div", "chart-sub", `Best stage here so far: ${bs[0]} (${Math.round(100 * bs[1] / tot)}% of fish). Station: ${st.name}.`)); }
    return card;
  }

  // ---- 🎉 Year in review + 🏅 badges (all worked out on the phone from your own catches and trips) ----
  const myCatches = () => Object.values(catchesBySpot).flat().filter(c => isMine(c) && c.caught_at);
  const myTrips = () => Object.values(sessionsBySpot).flat().filter(x => x.ended_at && me && x.created_by === me.id);
  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const BADGES = [
    { id: "first", icon: "🎣", name: "First fish", desc: "Log your first catch", n: x => x.fish, goal: 1 },
    { id: "f10", icon: "🐟", name: "Ten fish", desc: "Log 10 fish", n: x => x.fish, goal: 10 },
    { id: "f50", icon: "🐠", name: "Fifty fish", desc: "Log 50 fish", n: x => x.fish, goal: 50 },
    { id: "f100", icon: "🐡", name: "Century", desc: "Log 100 fish", n: x => x.fish, goal: 100 },
    { id: "f500", icon: "🦈", name: "Fish factory", desc: "Log 500 fish", n: x => x.fish, goal: 500 },
    { id: "sp5", icon: "📚", name: "Variety pack", desc: "Catch 5 different species", n: x => x.species.size, goal: 5 },
    { id: "sp10", icon: "🌈", name: "Collector", desc: "Catch 10 different species", n: x => x.species.size, goal: 10 },
    { id: "slam", icon: "🏅", name: "Inshore slam", desc: "Snook, redfish and spotted seatrout — all caught", n: x => ["snook", "redfish", "seatrout"].filter(w => [...x.species].some(s => s.includes(w))).length, goal: 3 },
    { id: "big", icon: "📏", name: "Big one", desc: "A fish 30″ or longer (measured)", n: x => x.maxLen, goal: 30 },
    { id: "slot", icon: "✅", name: "Slot snook", desc: "A snook between 28″ and 32″", n: x => x.slotSnook, goal: 1 },
    { id: "owl", icon: "🦉", name: "Night owl", desc: "A catch between 10 pm and 4 am", n: x => x.night, goal: 1 },
    { id: "early", icon: "🌅", name: "Early bird", desc: "5 catches before 7 am", n: x => x.early, goal: 5 },
    { id: "months", icon: "🗓", name: "Year-rounder", desc: "Catch fish in 6 different months", n: x => x.months.size, goal: 6 },
    { id: "photo", icon: "📸", name: "Photographer", desc: "10 catches with a photo", n: x => x.photos, goal: 10 },
    { id: "trips", icon: "⏱", name: "Dedicated", desc: "Log 10 trips", n: x => x.trips, goal: 10 },
    { id: "skunk", icon: "🦨", name: "Skunk survivor", desc: "Get skunked 3 times and keep going", n: x => x.skunks, goal: 3 },
    { id: "podium", icon: "🏆", name: "Podium", desc: "Finish top 3 in an official tournament", n: x => x.podium, goal: 1 },
    { id: "champ", icon: "🥇", name: "Champion", desc: "Win a board in an official tournament", n: x => x.wins, goal: 1 }
  ];
  function badgeCtx() {
    const cs = myCatches(), trips = myTrips(), x = { fish: 0, species: new Set(), maxLen: 0, slotSnook: 0, night: 0, early: 0, months: new Set(), photos: 0, trips: trips.length, skunks: trips.filter(t => !tripFish(t)).length, podium: 0, wins: 0 };
    const withPhoto = new Set(Object.values(photosBySpot).flat().map(p => p.catch_id));
    cs.forEach(c => {
      const k = c.how_many || 1, sp = (c.species || "").toLowerCase().trim(), h = new Date(c.caught_at).getHours(), L = +c.length_in || 0;
      x.fish += k; if (sp) x.species.add(sp); x.maxLen = Math.max(x.maxLen, L);
      if (/snook/.test(sp) && L >= 28 && L <= 32) x.slotSnook++;
      if (h >= 22 || h < 4) x.night++; if (h < 7) x.early++;
      x.months.add(new Date(c.caught_at).getFullYear() + "-" + new Date(c.caught_at).getMonth());
      if (withPhoto.has(c.id)) x.photos++;
    });
    const mineHof = hof.filter(r => me && r.user_id === me.id); x.podium = mineHof.length; x.wins = mineHof.filter(r => r.rank === 1).length;
    return x;
  }
  function renderYearReview() {
    const box = $("yir-body"); if (!box) return; box.innerHTML = "";
    if (!me) return;
    const cs = myCatches(), years = [...new Set(cs.map(c => new Date(c.caught_at).getFullYear()))].sort((a, b) => b - a);
    const sel = $("yir-year"), keep = +sel.value;
    sel.innerHTML = ""; (years.length ? years : [new Date().getFullYear()]).forEach(y => { const o = el("option", null, String(y)); o.value = y; sel.appendChild(o); });
    if (keep && years.includes(keep)) sel.value = keep;
    const y = +sel.value, yc = cs.filter(c => new Date(c.caught_at).getFullYear() === y);
    if (!yc.length) { box.appendChild(el("div", "empty", "Log some catches and your year in review builds itself here.")); }
    else {
      const fish = yc.reduce((n, c) => n + (c.how_many || 1), 0), trips = myTrips().filter(t => new Date(t.started_at).getFullYear() === y);
      const hrs = trips.reduce((n, t) => n + tripHours(t), 0), skunk = trips.filter(t => !tripFish(t)).length;
      const tiles = el("div", "tiles"); tiles.appendChild(tile(fish, "fish")); tiles.appendChild(tile(yc.length, "catches"));
      if (trips.length) { tiles.appendChild(tile(trips.length, "trips")); tiles.appendChild(tile(hrs.toFixed(hrs < 10 ? 1 : 0), "hours fished")); }
      box.appendChild(tiles);
      const tally = (fn) => { const m = new Map(); yc.forEach(c => { const k = fn(c); if (k) m.set(k, (m.get(k) || 0) + (c.how_many || 1)); }); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
      const lines = [];
      const topSp = tally(c => c.species && cap(c.species.trim()))[0]; if (topSp) lines.push(`🐟 Most caught: ${topSp[0]} (${topSp[1]})`);
      const prior = new Set(cs.filter(c => new Date(c.caught_at).getFullYear() < y).map(c => (c.species || "").toLowerCase().trim()));
      const fresh = [...new Set(yc.map(c => (c.species || "").toLowerCase().trim()).filter(s => s && !prior.has(s)))];
      if (fresh.length && prior.size) lines.push(`🆕 ${fresh.length} new species this year: ${fresh.slice(0, 6).map(cap).join(", ")}${fresh.length > 6 ? "…" : ""}`);
      const big = yc.filter(c => +c.length_in > 0).sort((a, b) => b.length_in - a.length_in)[0]; if (big) lines.push(`📏 Longest fish: ${cap(big.species || "fish")}, ${+Number(big.length_in).toFixed(1)}″ on ${new Date(big.caught_at).toLocaleDateString([], { month: "short", day: "numeric" })}`);
      const heavy = yc.filter(c => +c.weight_lb > 0 && !c.weight_est).sort((a, b) => b.weight_lb - a.weight_lb)[0]; if (heavy) lines.push(`⚖️ Heaviest (weighed): ${cap(heavy.species || "fish")}, ${lbText(Number(heavy.weight_lb))}`);
      const spotN = tally(c => { const s = (spots || []).find(x => x.id === c.spot_id); return s && s.name; })[0]; if (spotN) lines.push(`📍 Favorite spot: ${spotN[0]} (${spotN[1]} fish)`);
      const mo = tally(c => MONTH_NAMES[new Date(c.caught_at).getMonth()])[0]; if (mo) lines.push(`📅 Best month: ${mo[0]} (${mo[1]} fish)`);
      const dw = tally(c => DOW[new Date(c.caught_at).getDay()])[0]; if (dw) lines.push(`🗓 Best weekday: ${dw[0]}`);
      const bait = tally(c => c.bait && cap(c.bait.trim().toLowerCase()))[0]; if (bait) lines.push(`🪱 Top bait: ${bait[0]} (${bait[1]})`);
      if (trips.length) lines.push(`⏱ ${(fish / Math.max(hrs, 0.1)).toFixed(1)} fish per hour · ${skunk} skunked trip${skunk === 1 ? "" : "s"} (${Math.round(100 * skunk / trips.length)}%)`);
      lines.forEach(t => { const d = el("div", null, t); d.style.padding = "3px 0"; box.appendChild(d); });
    }
    // badges
    const ctx = badgeCtx(), earned = BADGES.filter(b => b.n(ctx) >= b.goal);
    box.appendChild(el("div", "label", `🏅 Badges (${earned.length}/${BADGES.length})`)); box.lastChild.style.marginTop = "14px";
    const grid = el("div", "badges");
    BADGES.forEach(b => {
      const have = b.n(ctx) >= b.goal, d = el("div", "badge" + (have ? " on" : "")); d.title = b.desc;
      d.appendChild(el("div", "badge-i", b.icon)); d.appendChild(el("b", null, b.name));
      d.appendChild(el("div", "spot-meta", have ? "Earned" : `${Math.floor(Math.min(b.n(ctx), b.goal))}/${b.goal} · ${b.desc}`));
      grid.appendChild(d);
    });
    box.appendChild(grid);
  }
  $("yir-year").addEventListener("change", renderYearReview);

  function renderInsights() {
    if ($("view-insights").hidden) return;
    renderRecords();
    renderYearReview();
    renderTackle();
    fillInsightPickers();
    const list = insightCatches();
    const fish = list.reduce((n, c) => n + (c.how_many || 1), 0);
    const tiles = $("ins-tiles"); tiles.innerHTML = "";
    const bySpecies = new Map();
    list.forEach(c => { const k = cap((c.species || "").trim()); bySpecies.set(k, (bySpecies.get(k) || 0) + (c.how_many || 1)); });
    const topSpecies = [...bySpecies.entries()].sort((a, b) => b[1] - a[1])[0];
    tiles.appendChild(tile(fish, "fish caught"));
    tiles.appendChild(tile(list.length, "catches logged"));
    tiles.appendChild(tile(topSpecies ? topSpecies[0] : "—", "most caught"));
    const spotId = $("ins-spot").value, mineOnly = $("ins-mine").checked;
    const trips = Object.values(sessionsBySpot).flat().filter(x => x.ended_at && (!spotId || x.spot_id === spotId) && (!mineOnly || (me && x.created_by === me.id)));
    if (trips.length) {
      const hrs = trips.reduce((n, x) => n + tripHours(x), 0), tf = trips.reduce((n, x) => n + tripFish(x), 0);
      const skunks = trips.filter(x => !tripFish(x)).length;
      tiles.appendChild(tile(trips.length, "trips logged"));
      tiles.appendChild(tile((tf / hrs).toFixed(1), "fish per hour"));
      tiles.appendChild(tile(Math.round(100 * skunks / trips.length) + "%", "trips skunked"));
    }
    $("ins-note").textContent = !list.length ? "No catches match yet — log some catches and the patterns will show up here."
      : (list.length < 20 ? `Based on ${list.length} catch${list.length === 1 ? "" : "es"}. Patterns get more trustworthy after about 20. ` : "") +
        "Counts also reflect when you fish — if you mostly go on outgoing tides, outgoing will look best.";
    const charts = $("ins-charts"); charts.innerHTML = "";
    INSIGHT_CHARTS.forEach(def => {
      if (def.hideWhenSpecies && $("ins-species").value) return;
      if (def.hideWhenSpot && $("ins-spot").value) return;
      const card = barChart(def, list);
      if (card) charts.appendChild(card);
    });
    const tc = spotId ? tideCard(spotId, list) : null; if (tc) charts.insertBefore(tc, charts.firstChild);
    [heatCard(list), baitCard(list)].forEach(c => { if (c) charts.appendChild(c); });
  }
  ["ins-spot", "ins-species", "ins-mine"].forEach(id => $(id).addEventListener("change", renderInsights));

