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
  function tankDraw(kind, data, box) {
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
      b.addEventListener("click", () => tankInfo(f, kind, info));
      tank.appendChild(b);
    });
    tank.appendChild(el("div", "tank-sand"));
    card.appendChild(tank);
    const info = el("div", "tank-info"); info.hidden = true; card.appendChild(info);
    box.appendChild(card);
  }
  function tankInfo(f, kind, i) {
    const c = f.catchRow; i.innerHTML = ""; i.hidden = false;
    i.appendChild(el("div", "tank-info-t", `${kind === "salt" ? "🌊" : "🌿"} ${f.species}`));
    i.appendChild(el("div", null, tankFishText(f) || "No size logged for this one"));
    const when = c.caught_at ? new Date(c.caught_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
    i.appendChild(el("div", "spot-meta", "Your best — " + [when, f.spotName ? "at " + f.spotName : ""].filter(Boolean).join(" ")));
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
    tankDraw("salt", t.salt, box); tankDraw("fresh", t.fresh, box); overflowDraw(t, "fresh", pbox); overflowDraw(t, "salt", lbox);
  }
  document.querySelectorAll("#tank-sw button").forEach(b => b.addEventListener("click", () => { tankMode = b.dataset.mode; renderTank(); }));
