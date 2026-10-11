  // ---- 🐠 Tank: your best catch of each species swims in a saltwater or freshwater tank; every other fish goes to the pond ----
  // "Best" = heaviest, length breaks a tie. Which tank a species lives in: the Seasons list knows (fresh vs not),
  // then a few freshwater names, then where you caught it. Brackish spots never decide it for a known species.
  const TANK_FRESH_RE = /\b(largemouth|peacock|bluegill|crappie|catfish|tilapia|oscar|bowfin|gar|snakehead|knifefish|cichlid|sunfish|panfish|carp|pickerel|bream|shiner|warmouth|redear|bullhead)\b/i;
  // How each species is drawn: shape (torpedo, deep, bass, long, flat), colours and a marking.
  const TANK_LOOKS = [
    { m: /snook/, shape: "torpedo", body: "#bcbf78", belly: "#f3f1d2", mark: "stripe" },
    { m: /tarpon/, shape: "deep", body: "#a9b6c0", belly: "#eef2f5", mark: "scales" },
    { m: /redfish|red drum/, shape: "torpedo", body: "#c8683a", belly: "#f2cbaa", mark: "spot" },
    { m: /trout/, shape: "torpedo", body: "#9aa88c", belly: "#ecebdf", mark: "dots" },
    { m: /jack|permit|pompano/, shape: "deep", body: "#c4ad55", belly: "#f0e7bd", mark: "" },
    { m: /snapper/, shape: "deep", body: "#b7542f", belly: "#ebb494", mark: "" },
    { m: /sheepshead/, shape: "deep", body: "#aeb4b7", belly: "#e8ebec", mark: "bars" },
    { m: /drum/, shape: "deep", body: "#6d7176", belly: "#bbbec0", mark: "bars" },
    { m: /barracuda|needlefish|ladyfish|wahoo|cobia/, shape: "long", body: "#8d9aa3", belly: "#e4e9ec", mark: "stripe" },
    { m: /mackerel|bluefish|mahi|dolphin|sailfish|king/, shape: "torpedo", body: "#6f95a8", belly: "#e3edf2", mark: "stripe" },
    { m: /grouper/, shape: "bass", body: "#7b5b3b", belly: "#c8ab8c", mark: "dots" },
    { m: /peacock/, shape: "bass", body: "#c7a02a", belly: "#f1e3a2", mark: "bars" },
    { m: /largemouth|bass/, shape: "bass", body: "#5f8a3e", belly: "#dbe7b4", mark: "stripe" },
    { m: /bluegill|sunfish|panfish|tilapia|cichlid|oscar|bream|crappie|warmouth|redear/, shape: "deep", body: "#4f8ca6", belly: "#e8a449", mark: "bars" },
    { m: /\bgar\b|snakehead|knifefish|bowfin/, shape: "long", body: "#7c8d5b", belly: "#dcdcb2", mark: "dots" },
    { m: /catfish|bullhead/, shape: "bass", body: "#6e7c87", belly: "#c5cdd2", mark: "" },
    { m: /shark/, shape: "torpedo", body: "#7d8b97", belly: "#e7ecef", mark: "" },
    { m: /ray|flounder|skate/, shape: "flat", body: "#8e7a5e", belly: "#d8c9ae", mark: "dots" }
  ];
  const TANK_SHAPES = {
    torpedo: { body: "M18 30 C34 12 86 8 114 30 C86 52 34 48 18 30 Z", tail: "M22 30 L2 13 L2 47 Z", fin: "M48 17 L62 7 L80 17 Z", fin2: "M62 45 L72 53 L84 44 Z" },
    deep: { body: "M24 30 C34 3 92 1 112 30 C92 59 34 57 24 30 Z", tail: "M27 30 L6 11 L6 49 Z", fin: "M42 11 L64 -1 L88 11 Z", fin2: "M58 51 L72 59 L86 50 Z" },
    bass: { body: "M20 30 C34 9 90 5 114 27 C113 41 100 51 70 51 C40 53 26 45 20 30 Z", tail: "M23 30 L3 14 L3 46 Z", fin: "M44 13 L62 3 L86 12 Z", fin2: "M60 48 L72 56 L84 48 Z" },
    long: { body: "M10 30 C30 21 92 19 117 28 L117 33 C92 41 30 39 10 30 Z", tail: "M14 30 L0 19 L0 41 Z", fin: "M30 24 L40 17 L52 23 Z", fin2: "M34 37 L42 43 L52 38 Z" },
    flat: { body: "M8 30 C28 4 96 4 116 30 C96 56 28 56 8 30 Z", tail: "M10 30 L-2 28 L-2 32 Z", fin: "M52 10 L62 6 L72 10 Z", fin2: "M52 50 L62 54 L72 50 Z" }
  };
  function tankLook(species) {
    const name = String(species || "").toLowerCase();
    const f = TANK_LOOKS.find(l => l.m.test(name));
    if (f) return f;
    let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    return { shape: "deep", body: `hsl(${h} 42% 52%)`, belly: `hsl(${h} 50% 86%)`, mark: "" };
  }
  let tankUid = 0;
  // Draw one fish as inline SVG (faces right). Returns an <svg> element.
  function fishSvg(species, px) {
    const NS = "http://www.w3.org/2000/svg", L = tankLook(species), S = TANK_SHAPES[L.shape], id = "tf" + (++tankUid);
    const svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "-4 -4 128 68"); svg.setAttribute("width", px); svg.setAttribute("height", Math.round(px * 68 / 128)); svg.setAttribute("aria-hidden", "true");
    const mk = (tag, a) => { const e = document.createElementNS(NS, tag); Object.keys(a).forEach(k => e.setAttribute(k, a[k])); return e; };
    const defs = mk("defs", {}); const g = mk("linearGradient", { id: id + "g", x1: 0, y1: 0, x2: 0, y2: 1 });
    [[0, L.body], [0.55, L.body], [1, L.belly]].forEach(([o, c]) => g.appendChild(mk("stop", { offset: o, "stop-color": c })));
    const cp = mk("clipPath", { id: id + "c" }); cp.appendChild(mk("path", { d: S.body })); defs.appendChild(g); defs.appendChild(cp); svg.appendChild(defs);
    const dark = "rgba(20,30,35,.55)";
    svg.appendChild(mk("path", { d: S.tail, fill: L.body })); svg.appendChild(mk("path", { d: S.fin, fill: L.body, opacity: .85 })); svg.appendChild(mk("path", { d: S.fin2, fill: L.body, opacity: .8 }));
    svg.appendChild(mk("path", { d: S.body, fill: `url(#${id}g)`, stroke: "rgba(0,0,0,.25)", "stroke-width": 1 }));
    const marks = mk("g", { "clip-path": `url(#${id}c)` });
    if (L.mark === "stripe") marks.appendChild(mk("path", { d: "M26 30 L112 29", stroke: dark, "stroke-width": 3.2, fill: "none" }));
    if (L.mark === "bars") [44, 58, 72, 86].forEach(x => marks.appendChild(mk("rect", { x, y: 0, width: 5, height: 60, fill: dark, opacity: .6 })));
    if (L.mark === "spot") marks.appendChild(mk("circle", { cx: 34, cy: 28, r: 4.5, fill: "#1b1b1b" }));
    if (L.mark === "dots") [[50, 22], [64, 28], [78, 21], [58, 38], [90, 30], [44, 30], [72, 36]].forEach(([x, y]) => marks.appendChild(mk("circle", { cx: x, cy: y, r: 2.4, fill: dark })));
    if (L.mark === "scales") [[46, 22], [60, 22], [74, 22], [88, 24], [53, 32], [67, 32], [81, 33], [60, 42], [74, 42]].forEach(([x, y]) => marks.appendChild(mk("circle", { cx: x, cy: y, r: 6, fill: "none", stroke: "rgba(255,255,255,.55)", "stroke-width": 1 })));
    svg.appendChild(marks);
    svg.appendChild(mk("path", { d: "M92 18 C98 26 98 36 92 44", stroke: "rgba(0,0,0,.25)", "stroke-width": 1.4, fill: "none" })); // gill
    svg.appendChild(mk("circle", { cx: 102, cy: 27, r: 3.4, fill: "#fff" })); svg.appendChild(mk("circle", { cx: 103, cy: 27, r: 1.9, fill: "#101010" }));
    return svg;
  }
  // Pure maths: turns your catches into { salt: {fish, pond}, fresh: {fish, pond} }.
  function tankBuild(catches, spotList) {
    const spotOf = id => (spotList || []).find(s => s.id === id);
    const better = (a, b) => {
      const w = x => x.weight_lb == null ? -1 : +x.weight_lb, l = x => x.length_in == null ? -1 : +x.length_in;
      return w(a) - w(b) || l(a) - l(b) || new Date(a.caught_at) - new Date(b.caught_at);
    };
    const by = {};
    catches.forEach(c => { const sp = String(c.species || "").trim(); if (!sp) return; (by[sp.toLowerCase()] = by[sp.toLowerCase()] || []).push(c); });
    const out = { salt: { fish: [], pond: [] }, fresh: { fish: [], pond: [] } };
    Object.keys(by).forEach(key => {
      const list = by[key].slice().sort((a, b) => better(b, a)), best = list[0], name = cap(String(best.species).trim());
      const sf = typeof seasonFor === "function" ? seasonFor(name) : null;
      let home;
      if (sf) home = sf.group === "fresh" ? "fresh" : "salt";
      else if (TANK_FRESH_RE.test(name)) home = "fresh";
      else { let fr = 0, other = 0; list.forEach(c => { const s = spotOf(c.spot_id); if (s && s.water_type === "freshwater") fr++; else other++; }); home = fr > other ? "fresh" : "salt"; }
      const extra = Math.max(0, (best.how_many || 1) - 1) + list.slice(1).reduce((n, c) => n + (c.how_many || 1), 0);
      const sp = spotOf(best.spot_id);
      out[home].fish.push({ key, species: name, catchRow: best, spotName: sp ? sp.name : null, pondCount: extra, look: tankLook(name) });
      if (extra) out[home].pond.push({ species: name, n: extra });
    });
    ["salt", "fresh"].forEach(t => { out[t].fish.sort((a, b) => better(b.catchRow, a.catchRow)); out[t].pond.sort((a, b) => b.n - a.n); });
    return out;
  }
  const tankInches = c => c.length_in != null ? +c.length_in : c.weight_lb != null ? 4 + 10 * Math.cbrt(+c.weight_lb) : 14;
  const tankPx = c => Math.max(40, Math.min(118, Math.round(14 + tankInches(c) * 2)));
  function tankFishText(f) {
    const c = f.catchRow, bits = [];
    if (c.weight_lb != null) bits.push(`${(+c.weight_lb).toFixed(1)} lb`);
    if (c.length_in != null) bits.push(`${(+c.length_in).toFixed(1)} in`);
    return bits.join(" · ");
  }
  function tankDraw(kind, data, box, opts) {
    opts = opts || {};
    const salt = kind === "salt", fish = data.fish;
    const card = el("div", "tank-card");
    card.appendChild(el("div", "label", salt ? "🌊 Saltwater tank" : "🌿 Freshwater tank"));
    if (!fish.length) {
      card.appendChild(emptyBox(salt ? "No saltwater fish yet. Your best catch of each saltwater species will swim here." : "No freshwater fish yet. Your best catch of each freshwater species will swim here.", "📸 Log a catch", () => { $("qc-fab").click(); }));
      box.appendChild(card); return;
    }
    const rows = Math.ceil(fish.length / 2), tank = el("div", "tank " + (salt ? "tank-salt" : "tank-fresh"));
    tank.style.height = (rows * 78 + 46) + "px";
    for (let i = 0; i < 6; i++) { const b = el("span", "bubble"); b.style.left = (8 + i * 16) + "%"; b.style.animationDelay = (i * 1.3) + "s"; b.style.animationDuration = (7 + (i % 3) * 2) + "s"; tank.appendChild(b); }
    fish.forEach((f, i) => {
      const slot = i % 2, row = Math.floor(i / 2), px = tankPx(f.catchRow);
      const b = el("button", "tfish"); b.type = "button";
      b.style.top = (row * 78 + 8 + Math.round((60 - px * 68 / 128) / 2)) + "px";
      b.style.left = slot ? "50%" : "4%";
      b.style.setProperty("--dx", (slot ? -1 : 1) * (10 + (i * 7) % 16) + "px");
      b.style.animationDuration = (5 + (i * 3) % 5) + "s"; b.style.animationDelay = (-(i * 1.7) % 5) + "s";
      b.setAttribute("aria-label", `${f.species}, ${tankFishText(f) || "no size logged"}. Tap for details.`);
      const sv = fishSvg(f.species, px); if (slot) sv.style.transform = "scaleX(-1)"; b.appendChild(sv);
      b.addEventListener("click", () => tankInfo(f, kind, info, opts));
      tank.appendChild(b);
    });
    tank.appendChild(el("div", "tank-sand"));
    // Decorations are earned: one more for every couple of species in this tank (so friends see the same ones on your profile)
    const deco = TANK_DECOR[salt ? "salt" : "fresh"], got = deco.filter(d => fish.length >= d.at);
    got.forEach((d, i) => { const e = el("span", "decor", d.e); e.style.left = (5 + i * (76 / Math.max(deco.length - 1, 1))) + "%"; e.style.fontSize = d.sz + "px"; e.title = d.n; e.setAttribute("aria-hidden", "true"); tank.appendChild(e); });
    card.appendChild(tank);
    const nxt = deco.find(d => fish.length < d.at);
    card.appendChild(el("div", "spot-meta", got.length ? `${got.length} of ${deco.length} decorations unlocked` + (nxt ? ` · next one at ${nxt.at} species` : " — tank fully decorated! 🎉") : `First decoration unlocks at ${deco[0].at} species.`));
    if (!opts.other) {
      const fb = el("button", "btn ghost feed-btn", "🍤 Feed the fish"); fb.type = "button";
      fb.addEventListener("click", () => tankFeed(tank, fb));
      card.appendChild(fb);
    }
    const info = el("div", "tank-info"); info.hidden = true; card.appendChild(info);
    box.appendChild(card);
  }
  // Decorations that unlock as a tank fills up (at = number of species in that tank)
  const TANK_DECOR = {
    salt: [{ at: 2, e: "🌿", n: "Seaweed", sz: 26 }, { at: 4, e: "🐚", n: "Shell", sz: 20 }, { at: 6, e: "⚓", n: "Anchor", sz: 24 }, { at: 8, e: "🪸", n: "Coral", sz: 28 }, { at: 10, e: "🏰", n: "Castle", sz: 32 }],
    fresh: [{ at: 2, e: "🌿", n: "Water plant", sz: 26 }, { at: 4, e: "🪨", n: "Rock", sz: 22 }, { at: 6, e: "🪷", n: "Lily", sz: 26 }, { at: 8, e: "🏺", n: "Old jar", sz: 26 }, { at: 10, e: "🏰", n: "Castle", sz: 32 }]
  };
  // Feed the fish: flakes sink and every fish does a happy wiggle. Just for fun — nothing is saved.
  function tankFeed(tank, btn) {
    if (btn.disabled) return; btn.disabled = true;
    for (let i = 0; i < 16; i++) { const f = el("span", "flake"); f.style.left = (4 + i * 6) + "%"; f.style.animationDelay = (i % 6) * 0.12 + "s"; tank.appendChild(f); setTimeout(() => f.remove(), 3000); }
    tank.classList.add("feeding");
    const old = btn.textContent; btn.textContent = "😋 Yum!";
    setTimeout(() => { tank.classList.remove("feeding"); btn.textContent = old; btn.disabled = false; }, 2600);
  }
  function tankInfo(f, kind, i, opts) {
    const c = f.catchRow; i.innerHTML = ""; i.hidden = false;
    i.appendChild(el("div", "tank-info-t", `${kind === "salt" ? "🌊" : "🌿"} ${f.species}`));
    i.appendChild(el("div", null, tankFishText(f) || "No size logged for this one"));
    const when = c.caught_at ? new Date(c.caught_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
    i.appendChild(el("div", "spot-meta", ((opts && opts.other) ? "Their best — " : "Your best — ") + [when, f.spotName && !(opts && opts.noSpot) ? "at " + f.spotName : ""].filter(Boolean).join(" ")));
    if (f.pondCount) i.appendChild(el("div", "spot-meta", `${f.pondCount} smaller ${f.species} in the ${kind === "salt" ? "lagoon" : "pond"}`));
  }
  // Overflow fish live in their own scene: freshwater -> the pond, saltwater -> the lagoon (a count per species below it).
  function overflowDraw(t, kind, box) {
    const salt = kind === "salt", rows = t[kind].pond.slice().sort((a, b) => b.n - a.n);
    const total = rows.reduce((n, p) => n + p.n, 0), card = el("div", "tank-card");
    card.appendChild(el("div", "label", salt ? "🌴 Your lagoon" : "🏞 Your pond"));
    if (!total) { card.appendChild(emptyBox(salt ? "The lagoon is empty. When you catch a second fish of a saltwater species, the smaller one swims here and your best stays in the saltwater tank." : "The pond is empty. When you catch a second fish of a freshwater species, the smaller one swims here and your best stays in the freshwater tank.", "📸 Log a catch", () => { $("qc-fab").click(); })); box.appendChild(card); return; }
    const scene = el("div", salt ? "pond-scene lagoon-scene" : "pond-scene"); scene.style.height = "230px";
    [[8, 14, 46], [70, 62, 56], [38, 76, 38], [84, 20, 34]].forEach(([l, tp, w]) => { const d = el("span", salt ? "weed" : "pad"); d.style.cssText = `left:${l}%;top:${tp}%;width:${salt ? Math.round(w * .5) : w}px;height:${salt ? w + 20 : Math.round(w * .72)}px`; scene.appendChild(d); });
    const fishList = []; rows.forEach(p => { for (let k = 0; k < p.n; k++) fishList.push(p.species); });
    let shown = 0;
    fishList.slice(0, 40).forEach((sp, i) => {
      const b = el("span", "pfish"); b.style.left = (4 + (i * 37) % 84) + "%"; b.style.top = (8 + (i * 53) % 74) + "%";
      b.style.setProperty("--dx", ((i % 2 ? -1 : 1) * (8 + (i * 5) % 14)) + "px"); b.style.animationDuration = (4 + (i * 3) % 6) + "s"; b.style.animationDelay = (-(i * 1.3) % 5) + "s";
      const sv = fishSvg(sp, 30); if (i % 2) sv.style.transform = "scaleX(-1)"; b.appendChild(sv); scene.appendChild(b); shown++;
    });
    card.appendChild(scene);
    if (total > shown) card.appendChild(el("div", "spot-meta", `Showing ${shown} of ${total} fish`));
    const list = el("div", "pond-list");
    rows.forEach(p => { const r = el("div", "pond-row"); const pf = el("span", "pf"); pf.appendChild(fishSvg(p.species, 34)); r.appendChild(pf); r.appendChild(el("span", "pond-sp", p.species)); r.appendChild(el("b", null, "×" + p.n)); list.appendChild(r); });
    card.appendChild(list);
    box.appendChild(card);
  }
  let tankMode = "tanks";
  function renderTank() {
    const box = $("tank-body"), pbox = $("pond-body"), lbox = $("lagoon-body"); if (!box) return; box.innerHTML = ""; pbox.innerHTML = ""; lbox.innerHTML = "";
    document.querySelectorAll("#tank-sw button").forEach(b => { b.classList.toggle("ghost", b.dataset.mode !== tankMode); b.setAttribute("aria-pressed", String(b.dataset.mode === tankMode)); });
    box.hidden = tankMode !== "tanks"; pbox.hidden = tankMode !== "pond"; lbox.hidden = tankMode !== "lagoon";
    if (!me || spots === null) { box.appendChild(el("div", "empty", "Loading your catches…")); return; }
    const mine = Object.values(catchesBySpot).flat().filter(c => c.created_by === me.id && !c.deleted_at);
    const t = tankBuild(mine, spots), n = t.salt.fish.length + t.fresh.fish.length;
    const sum = x => x.pond.reduce((s, p) => s + p.n, 0);
    $("tank-sum").textContent = n ? `${n} species in your tanks · ${t.salt.fish.length} saltwater · ${t.fresh.fish.length} freshwater · ${sum(t.salt)} in the lagoon · ${sum(t.fresh)} in the pond` : "Log a catch and your first fish appears.";
    tankDraw("salt", t.salt, box); tankDraw("fresh", t.fresh, box); collectionDraw(mine, box); overflowDraw(t, "fresh", pbox); overflowDraw(t, "salt", lbox);
  }
  document.querySelectorAll("#tank-sw button").forEach(b => b.addEventListener("click", () => { tankMode = b.dataset.mode; renderTank(); }));

  // ---- 🏆 Collections: how many of each Seasons group (inshore, beach & pier, offshore, freshwater) you have caught ----
  // Uses the same species list as the Seasons tab, so a new fish there becomes a new goal here. The mullet run is bait, not a catch.
  function tankCollection(catches) {
    const seen = new Set();
    (catches || []).forEach(c => { if (c.deleted_at) return; const f = seasonFor(c.species); if (f) seen.add(f.name); });
    return SEASON_GROUPS.map(([key, label]) => {
      const all = SEASONS.filter(f => f.group === key && !/mullet run/i.test(f.name)).map(f => f.name);
      const got = all.filter(n => seen.has(n));
      return { key, label, total: all.length, got, missing: all.filter(n => !seen.has(n)) };
    }).filter(g => g.total);
  }
  function collectionDraw(catches, box, opts) {
    const cols = tankCollection(catches), card = el("div", "tank-card");
    card.appendChild(el("div", "label", "🏆 Collections"));
    const done = cols.filter(g => g.got.length === g.total).length;
    card.appendChild(el("div", "spot-meta", done ? `${done} of ${cols.length} collections complete — nice!` : "Catch every fish in a group to complete it. Tap a group to see the list."));
    const list = el("div", "col-list");
    cols.forEach(g => {
      const full = g.got.length === g.total, pct = Math.round(100 * g.got.length / g.total);
      const btn = el("button", "col-row"); btn.type = "button"; btn.setAttribute("aria-expanded", "false");
      btn.appendChild(el("span", "col-name", (full ? "🏅 " : "") + g.label));
      btn.appendChild(el("b", null, `${g.got.length} of ${g.total}`));
      const bar = el("span", "col-bar"), fill = el("i"); fill.style.width = pct + "%"; bar.appendChild(fill); btn.appendChild(bar);
      const det = el("div", "col-det"); det.hidden = true;
      g.got.forEach(n => { const c = el("span", "col-chip got"); c.appendChild(fishSvg(n, 30)); c.appendChild(el("span", null, "✓ " + n)); det.appendChild(c); });
      g.missing.forEach(n => det.appendChild(el("span", "col-chip", "· " + n)));
      btn.addEventListener("click", () => { det.hidden = !det.hidden; btn.setAttribute("aria-expanded", String(!det.hidden)); });
      list.appendChild(btn); list.appendChild(det);
    });
    card.appendChild(list); box.appendChild(card);
  }

  // ---- ✨ New best! When a fresh catch beats the best of its species (or is the first of its kind), a small celebration shows. ----
  // Called right after a catch is saved, before the lists reload, so "your tank before" is still the old one. Never throws.
  function tankCheck(row) {
    try {
      if (!me || !row || !String(row.species || "").trim()) return null;
      const mine = Object.values(catchesBySpot).flat().filter(c => c.created_by === me.id && !c.deleted_at && c.id !== row.id);
      const nr = Object.assign({}, row, { id: row.id || "new-catch", created_by: me.id, how_many: row.how_many || 1 });
      const key = String(row.species).trim().toLowerCase();
      const find = t => { for (const k of ["salt", "fresh"]) { const f = t[k].fish.find(x => x.key === key); if (f) return { f, kind: k }; } return null; };
      const after = find(tankBuild(mine.concat(nr), spots)), before = find(tankBuild(mine, spots));
      if (!after || after.f.catchRow !== nr) return null;
      if (before) {
        const w = x => x.weight_lb == null ? -1 : +x.weight_lb, l = x => x.length_in == null ? -1 : +x.length_in;
        if (!(((w(nr) - w(before.f.catchRow)) || (l(nr) - l(before.f.catchRow))) > 0)) return null; // a tie is not a new best
      }
      let goal = "";
      if (!before) {
        const sf = seasonFor(row.species), g = sf && tankCollection(mine.concat(nr)).find(x => x.key === sf.group);
        if (g) goal = g.got.length === g.total ? `🏅 That completes your ${g.label.toLowerCase()} collection!` : `That's ${g.got.length} of ${g.total} in your ${g.label.toLowerCase()} collection.`;
      }
      return { species: after.f.species, kind: after.kind, first: !before, now: tankFishText(after.f), old: before ? tankFishText(before.f) : "", goal };
    } catch (e) { return null; }
  }
  function tankPop(r) {
    if (!r) return;
    const salt = r.kind === "salt", prev = document.activeElement;
    const bg = el("div", "ask-bg"), box = el("div", "ask-box best-pop");
    box.setAttribute("role", "alertdialog"); box.setAttribute("aria-modal", "true");
    for (let i = 0; i < 14; i++) { const c = el("span", "confetti"); c.style.left = (4 + i * 7) + "%"; c.style.animationDelay = (i % 5) * 0.15 + "s"; c.style.background = ["#f2b134", "#e4572e", "#29a3a3", "#7bbf4a", "#c25ea8"][i % 5]; box.appendChild(c); }
    const fw = el("div", "best-fish"); fw.appendChild(fishSvg(r.species, 150)); box.appendChild(fw);
    box.appendChild(el("div", "best-t", r.first ? `🐠 New fish for your ${salt ? "saltwater" : "freshwater"} tank!` : `✨ New best ${r.species}!`));
    const lines = [];
    if (r.first) lines.push(`Your first ${r.species}${r.now ? " — " + r.now : ""}. It's swimming in the ${salt ? "saltwater" : "freshwater"} tank now.`);
    if (r.first && r.goal) lines.push(r.goal);
    else if (!r.first) { lines.push(`${r.now || "This one"} beats your old ${r.old || "best"}.`); lines.push(`The old fish moved to the ${salt ? "lagoon" : "pond"}.`); }
    lines.forEach(t => box.appendChild(el("div", "ask-text", t)));
    const row = el("div", "ask-btns"), bOk = el("button", "btn", "Nice!"), bSee = el("button", "btn ghost", "See my tank");
    bOk.type = bSee.type = "button"; row.appendChild(bSee); row.appendChild(bOk); box.appendChild(row); bg.appendChild(box);
    const end = () => { document.removeEventListener("keydown", key, true); bg.remove(); if (prev && prev.focus) { try { prev.focus(); } catch (e) { /* fine */ } } };
    const key = e => { if (e.key === "Escape") { e.preventDefault(); end(); } };
    document.addEventListener("keydown", key, true);
    bOk.addEventListener("click", end); bg.addEventListener("click", e => { if (e.target === bg) end(); });
    bSee.addEventListener("click", () => { end(); tankMode = "tanks"; $("tab-tank").click(); });
    document.body.appendChild(bg); bOk.focus();
  }

  // A person's tank on their profile page. `catches` are only the ones the viewer is allowed to see (database rules) and never private ones.
  // Other people's spots are not named; only size and date show.
  function tankProfile(catches, spotList, box, own) {
    const t = tankBuild(catches, spotList), n = t.salt.fish.length + t.fresh.fish.length;
    const head = el("div", "label", "🐠 Tank"); head.style.marginTop = "12px"; head.id = "prof-tank"; box.appendChild(head);
    if (!n) { box.appendChild(el("div", "spot-meta", own ? "No fish yet — public and friends-only catches show here." : "No fish in the tank yet.")); return; }
    const opts = { noSpot: true, other: !own };
    ["salt", "fresh"].forEach(k => { if (t[k].fish.length) tankDraw(k, t[k], box, opts); });
    const sum = x => x.pond.reduce((s, p) => s + p.n, 0), bits = [];
    if (sum(t.salt)) bits.push(`🌴 ${sum(t.salt)} in the lagoon`); if (sum(t.fresh)) bits.push(`🏞 ${sum(t.fresh)} in the pond`);
    if (bits.length) box.appendChild(el("div", "spot-meta", bits.join(" · ")));
    collectionDraw(catches, box);
  }
