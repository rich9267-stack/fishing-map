  // ---- 🐠 Tank: your best catch of each species swims in a saltwater or freshwater tank; every other fish goes to the pond ----
  // "Best" = heaviest, length breaks a tie. Which tank a species lives in: the Seasons list knows (fresh vs not),
  // then a few freshwater names, then where you caught it. Brackish spots never decide it for a known species.
  const TANK_FRESH_RE = /\b(largemouth|peacock|bluegill|crappie|catfish|tilapia|oscar|bowfin|gar|snakehead|knifefish|cichlid|sunfish|panfish|carp|pickerel|bream|shiner|warmouth|redear|bullhead|hoplo|pleco|suckermouth|clarias)\b/i;
  // How each species is drawn: shape (torpedo, deep, bass, long, flat), colours and a marking.
  const TANK_LOOKS = [
    // newer fish first, so specific names win over broad ones ("amberjack" before "jack")
    // Gulf + Keys fish and sharks (Oct 15 2026): above /snapper/, /jack/, /trout/ and the general /shark/ line at the bottom
    { m: /lionfish/, shape: "deep", body: "#a8452f", belly: "#ecd2b4", mark: "bars" },
    { m: /bonefish/, shape: "torpedo", body: "#c3ccd1", belly: "#f4f6f7", mark: "" },
    { m: /yellowfin tuna/, shape: "torpedo", body: "#4f7391", belly: "#e8e8d0", mark: "stripe" },
    { m: /blackfin tuna/, shape: "torpedo", body: "#46627c", belly: "#e4e9ee", mark: "" },
    { m: /cubera/, shape: "deep", body: "#8a4a3a", belly: "#d9b3a0", mark: "" },
    { m: /bar jack/, shape: "deep", body: "#8fa6b0", belly: "#eef1f2", mark: "stripe" },
    { m: /horse-eye|horse eye/, shape: "deep", body: "#9aa9a3", belly: "#ece9c2", mark: "" },
    { m: /sand seatrout|sand trout|white trout/, shape: "torpedo", body: "#b9bfb0", belly: "#f1efe6", mark: "" },
    { m: /blacktip/, shape: "torpedo", body: "#7d8a94", belly: "#eef1f2", mark: "" },
    { m: /bull shark/, shape: "bass", body: "#76828b", belly: "#e9edef", mark: "" },
    { m: /bonnethead/, shape: "torpedo", body: "#8d979c", belly: "#e7eaeb", mark: "" },
    { m: /nurse shark/, shape: "long", body: "#8a7a62", belly: "#d9cdb4", mark: "" },
    { m: /lemon shark/, shape: "bass", body: "#b8a466", belly: "#efe6c4", mark: "" },
    // catfish first: "walking" contains "king", which would otherwise draw it as a mackerel
    { m: /walking catfish|clarias/, shape: "long", body: "#5f5a52", belly: "#b9b2a4", mark: "dots" },
    { m: /sailfin catfish|suckermouth|pleco/, shape: "bass", body: "#4e4a3f", belly: "#a8a08a", mark: "dots" },
    { m: /hoplo/, shape: "bass", body: "#5b4a3a", belly: "#b5a38c", mark: "dots" },
    { m: /gafftop/, shape: "torpedo", body: "#7f8e9b", belly: "#eef1f3", mark: "" },
    { m: /hardhead/, shape: "torpedo", body: "#8a8f86", belly: "#e7e8e1", mark: "" },
    { m: /blue cat/, shape: "bass", body: "#6f8aa0", belly: "#e1e8ee", mark: "" },
    { m: /flathead cat|shovelhead/, shape: "bass", body: "#7a6a3f", belly: "#ddd0a2", mark: "dots" },
    { m: /channel cat/, shape: "bass", body: "#7d8d98", belly: "#e3e8eb", mark: "dots" },
    { m: /white cat/, shape: "bass", body: "#9aa3a8", belly: "#f1f3f4", mark: "" },
    { m: /black bullhead/, shape: "bass", body: "#3c3f3a", belly: "#b8b59c", mark: "" },
    { m: /yellow bullhead/, shape: "bass", body: "#9a8540", belly: "#ecd98a", mark: "" },
    { m: /spotted bullhead/, shape: "bass", body: "#5d5747", belly: "#cfc6ae", mark: "dots" },
    { m: /bullhead|headwater cat/, shape: "bass", body: "#6b5a40", belly: "#cdbb98", mark: "dots" },
    { m: /tripletail/, shape: "deep", body: "#8a7b4f", belly: "#cdbf93", mark: "dots" },
    { m: /flounder/, shape: "flat", body: "#9a8461", belly: "#e5d9bd", mark: "dots" },
    { m: /hogfish|hog snapper/, shape: "deep", body: "#c9805f", belly: "#f1d3c1", mark: "" },
    { m: /amberjack/, shape: "torpedo", body: "#8f8a58", belly: "#e7e2bd", mark: "stripe" },
    { m: /spadefish/, shape: "deep", body: "#9aa3a8", belly: "#e6eaec", mark: "bars" },
    { m: /blue runner|hardtail/, shape: "torpedo", body: "#5f8fa6", belly: "#dfeaee", mark: "" },
    { m: /little tunny|bonito|false albacore/, shape: "torpedo", body: "#5f7f94", belly: "#e6edf0", mark: "dots" },
    { m: /pinfish/, shape: "deep", body: "#b9b27a", belly: "#ece8c4", mark: "stripe" },
    { m: /crappie|speckled perch/, shape: "deep", body: "#a6aa8a", belly: "#eef0dc", mark: "dots" },
    { m: /\boscar\b/, shape: "deep", body: "#55503f", belly: "#d98a3d", mark: "bars" },
    { m: /tilapia/, shape: "deep", body: "#8fa3a5", belly: "#e3ecea", mark: "bars" },
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
  // `live` = the fish has moving parts (tail swish, fin flutter, body sway, blinking). Every part has its own class (fs-tail, fs-fin,
  // fs-fin2, fs-body, fs-eye) so an artist's pieces can be swapped in later. Motion is switched off for reduced-motion in the CSS.
  function fishSvg(species, px, live) {
    const NS = "http://www.w3.org/2000/svg", L = tankLook(species), S = TANK_SHAPES[L.shape], id = "tf" + (++tankUid);
    const svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "-4 -4 128 68"); svg.setAttribute("width", px); svg.setAttribute("height", Math.round(px * 68 / 128)); svg.setAttribute("aria-hidden", "true");
    const mk = (tag, a) => { const e = document.createElementNS(NS, tag); Object.keys(a).forEach(k => e.setAttribute(k, a[k])); return e; };
    const defs = mk("defs", {}); const g = mk("linearGradient", { id: id + "g", x1: 0, y1: 0, x2: 0, y2: 1 });
    [[0, L.body], [0.55, L.body], [1, L.belly]].forEach(([o, c]) => g.appendChild(mk("stop", { offset: o, "stop-color": c })));
    const cp = mk("clipPath", { id: id + "c" }); cp.appendChild(mk("path", { d: S.body })); defs.appendChild(g); defs.appendChild(cp); svg.appendChild(defs);
    const dark = "rgba(20,30,35,.55)", rig = mk("g", { class: "fs-rig" });
    rig.appendChild(mk("path", { class: "fs-tail", d: S.tail, fill: L.body })); rig.appendChild(mk("path", { class: "fs-fin", d: S.fin, fill: L.body, opacity: .85 })); rig.appendChild(mk("path", { class: "fs-fin2", d: S.fin2, fill: L.body, opacity: .8 }));
    const body = mk("g", { class: "fs-body" });
    body.appendChild(mk("path", { d: S.body, fill: `url(#${id}g)`, stroke: "rgba(0,0,0,.25)", "stroke-width": 1 }));
    const marks = mk("g", { "clip-path": `url(#${id}c)` });
    if (L.mark === "stripe") marks.appendChild(mk("path", { d: "M26 30 L112 29", stroke: dark, "stroke-width": 3.2, fill: "none" }));
    if (L.mark === "bars") [44, 58, 72, 86].forEach(x => marks.appendChild(mk("rect", { x, y: 0, width: 5, height: 60, fill: dark, opacity: .6 })));
    if (L.mark === "spot") marks.appendChild(mk("circle", { cx: 34, cy: 28, r: 4.5, fill: "#1b1b1b" }));
    if (L.mark === "dots") [[50, 22], [64, 28], [78, 21], [58, 38], [90, 30], [44, 30], [72, 36]].forEach(([x, y]) => marks.appendChild(mk("circle", { cx: x, cy: y, r: 2.4, fill: dark })));
    if (L.mark === "scales") [[46, 22], [60, 22], [74, 22], [88, 24], [53, 32], [67, 32], [81, 33], [60, 42], [74, 42]].forEach(([x, y]) => marks.appendChild(mk("circle", { cx: x, cy: y, r: 6, fill: "none", stroke: "rgba(255,255,255,.55)", "stroke-width": 1 })));
    body.appendChild(marks);
    body.appendChild(mk("path", { class: "fs-gill", d: "M92 18 C98 26 98 36 92 44", stroke: "rgba(0,0,0,.25)", "stroke-width": 1.4, fill: "none" })); // gill
    const eye = mk("g", { class: "fs-eye" });
    eye.appendChild(mk("circle", { cx: 102, cy: 27, r: 3.4, fill: "#fff" })); eye.appendChild(mk("circle", { cx: 103, cy: 27, r: 1.9, fill: "#101010" }));
    body.appendChild(eye); rig.appendChild(body); svg.appendChild(rig);
    if (live) { // each fish moves a little differently: its own speed and starting point
      let h = tankUid * 37; for (let i = 0; i < species.length; i++) h = (h * 31 + species.charCodeAt(i)) % 997;
      const fast = L.shape === "long" ? 0.7 : L.shape === "flat" ? 1.5 : 1;
      svg.setAttribute("class", "fish-live"); svg.style.setProperty("--fd", (fast * (0.85 + (h % 40) / 100)).toFixed(2) + "s"); svg.style.setProperty("--fo", "-" + ((h % 17) / 10).toFixed(1) + "s"); svg.style.setProperty("--bl", (4 + h % 5) + "s");
    }
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
  // ---- 🏊 Swimming engine: fish wander on their own, turn around smoothly, stay in the water, and sit at different depths ----
  // One shared timer drives every scene on screen; it stops when nothing is showing. A fish is { el, turnEl, w, h, depth } — `el` moves,
  // `turnEl` flips (scaleX passes through 0, so a turn looks like the fish rolling round) and tilts with its climb or dive.
  const TANK_SIMS = new Set(); let tankRaf = 0, tankLast = 0;
  const tankReduced = () => { try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; } };
  function tankRng(seed) { let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function tankSwim(scene, items, opts) {
    opts = opts || {};
    const sim = { scene, W: 0, H: 0, scale: 1, floor: opts.floor == null ? 18 : opts.floor, visible: true, time: 0, fish: [], still: tankReduced(), chase: !!opts.chase, moodSpeed: 1, mood: null, moodT: 0, feed: null, crumbs: [], eaten: 0, feedMode: false, feedBtns: [], foodEl: null };
    sim.resize = () => {
      sim.W = scene.clientWidth || sim.W || 340; sim.H = scene.clientHeight || sim.H || 260;
      sim.scale = Math.max(1, Math.min(2.2, Math.min(sim.W / 360, sim.H / 300)));
    };
    sim.resize();
    const lead = {};
    items.forEach((it, i) => {
      const r = tankRng(1000 + i * 7919 + (opts.seed || 0)), f = Object.assign({ x: 0, y: 0, vx: 0, vy: 0, turn: 1, tx: 0, ty: 0, tt: 0, rnd: r, sp: 0, phase: r() * 6.28, depth: 0.5, mode: "swim", mt: 0, cool: 4 + r() * 10, prey: null, follow: null, off: null, kind: "", bites: 0, fullT: 0, biteCd: 0, eatT: 0 }, it);
      f.sp = (opts.speed || 26) * (0.8 + r() * 0.5) * (1 + 18 / Math.max(f.w, 20) * 0.6);
      f.x = r() * Math.max(1, sim.W - f.w); f.y = r() * Math.max(1, sim.H - sim.floor - f.h);
      f.turn = r() < 0.5 ? 1 : -1; f.tt = 0;
      if (f.kind) { // fish of the same kind form a school behind the first one
        if (!lead[f.kind]) lead[f.kind] = f; else { f.follow = lead[f.kind]; f.off = [(r() - 0.5) * 100, (r() - 0.5) * 56]; f.depth = f.follow.depth; f.x = Math.max(0, f.follow.x + f.off[0]); f.y = Math.max(6, f.follow.y + f.off[1]); }
      }
      sim.fish.push(f);
    });
    sim.fish.forEach(f => {
      f.el.style.zIndex = String(2 + Math.round(f.depth * 6));
      f.el.style.filter = `drop-shadow(0 2px 2px rgba(0,0,0,.3)) brightness(${(0.78 + 0.22 * f.depth).toFixed(2)})`;
    });
    tankMoodApply(sim); tankTouchBind(sim);
    tankStep(sim, 0);
    if (!sim.still && typeof requestAnimationFrame === "function") {
      TANK_SIMS.add(sim);
      if (typeof IntersectionObserver === "function") { try { new IntersectionObserver(es => { sim.visible = es[es.length - 1].isIntersecting; }).observe(scene); } catch (e) { /* always visible */ } }
      if (typeof ResizeObserver === "function") { try { new ResizeObserver(() => sim.resize()).observe(scene); } catch (e) { /* manual resize only */ } }
      if (!tankRaf) tankRaf = requestAnimationFrame(tankTick);
    }
    scene.__sim = sim;
    return sim;
  }
  // How fish treat each other: they keep their distance (a back fish can pass behind a front one), same-kind fish school behind a leader,
  // and now and then a much bigger fish chases a smaller one, which bolts away (nobody gets hurt).
  function tankStep(sim, dt) {
    sim.time += dt; sim.moodT -= dt; if (sim.moodT <= 0) tankMoodApply(sim);
    const S = sim.scale, top = 6, F = sim.fish, n = F.length;
    const geo = F.map(f => { const sc = S * (0.8 + 0.2 * f.depth), w = f.w * sc, h = f.h * sc; return { w, h, cx: f.x + w / 2, cy: f.y + h / 2, r: Math.max(w * 0.42, h * 0.9) }; });
    if (dt > 0) tankFoodStep(sim, dt);
    if (dt > 0) {
      const ax = new Array(n).fill(0), ay = new Array(n).fill(0);
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const A = F[i], B = F[j]; if (Math.abs(A.depth - B.depth) > 0.4) continue; // different layers pass through each other
        const gi = geo[i], gj = geo[j], dx = gj.cx - gi.cx, dy = gj.cy - gi.cy, d = Math.hypot(dx, dy) || 0.01, R = (gi.r + gj.r) * 1.05;
        if (d < R) { const push = (1 - d / R) * 140, wi = gj.r / (gi.r + gj.r), ux = dx / d, uy = dy / d; ax[i] -= ux * push * wi * 2; ay[i] -= uy * push * wi * 2; ax[j] += ux * push * (1 - wi) * 2; ay[j] += uy * push * (1 - wi) * 2; }
        if (sim.chase) { // a chase starts only between very different sizes, close by, when the big fish is ready for some fun
          const big = gi.w >= gj.w ? i : j, small = big === i ? j : i, ratio = geo[big].w / Math.max(1, geo[small].w), P = F[big], Q = F[small];
          if (ratio >= 1.5 && P.mode === "swim" && P.cool <= 0 && Q.mode === "swim" && d < 170 && P.kind !== Q.kind && P.rnd() < dt * 0.35) { P.mode = "chase"; P.prey = Q; P.mt = 3.2; Q.mode = "flee"; Q.mt = 2.2; Q.chaser = P; Q.scare = null; }
        }
      }
      F.forEach((f, i) => {
        const g = geo[i], W = sim.W, maxX = Math.max(0, W - g.w - 4), maxY = Math.max(top, sim.H - sim.floor - g.h - 2);
        f.cool -= dt; f.tt -= dt;
        if (f.mode !== "swim") { f.mt -= dt; if (f.mt <= 0 || (f.mode === "chase" && (!f.prey || f.prey.mode !== "flee"))) { if (f.mode === "chase") f.cool = 10 + f.rnd() * 14; f.mode = "swim"; f.prey = null; f.scare = null; f.tt = 0; } }
        f.biteCd -= dt; f.eatT -= dt; if (f.fullT > 0) f.fullT -= dt;
        let food = null; if (!f.face) f.face = f.turn >= 0 ? 1 : -1; let mo = f.face > 0 ? 0.93 : 0.07; // the mouth is at the front of the fish
        if (f.mode === "swim" && f.fullT <= 0 && (sim.feed || sim.crumbs.length)) {
          let bd = 1e9;
          if (sim.feed) { const d = Math.hypot(sim.feed.x - g.cx, sim.feed.y - g.cy); if (d < 300 * S) { food = { x: sim.feed.x, y: sim.feed.y, pinch: true }; bd = d * 0.8; } }
          sim.crumbs.forEach(c => { const d = Math.hypot(c.x - g.cx, c.y - g.cy); if (!c.dead && d < 210 * S && d < bd) { food = { x: c.x, y: c.y, crumb: c }; bd = d; } });
          if (food && f.biteCd <= 0 && Math.hypot(food.x - (f.x + g.w * mo), food.y - (f.y + g.h * 0.5)) < 18 * S && (!food.pinch || sim.feed.supply >= 1)) {
            if (food.pinch) sim.feed.supply -= 1; else food.crumb.dead = true;
            f.bites++; f.biteCd = 0.9; f.eatT = 0.35; sim.eaten++; tankPop2(sim, food.x, food.y);
            if (f.bites >= 5) { f.bites = 0; f.fullT = (25 + f.rnd() * 15) * (sim.mood ? sim.mood.full : 1); } // full for a while
          }
        }
        let boost = 1;
        if (food && f.mode === "swim") { f.tx = Math.max(4, Math.min(maxX, food.x - g.w * mo)); f.ty = Math.max(top, Math.min(maxY, food.y - g.h / 2)); boost = 1.7; }
        else if (f.mode === "chase" && f.prey) { const pg = geo[F.indexOf(f.prey)]; f.tx = Math.max(4, Math.min(maxX, pg.cx - g.w / 2)); f.ty = Math.max(top, Math.min(maxY, pg.cy - g.h / 2)); boost = 1.8; }
        else if (f.mode === "flee" && (f.scare || f.chaser)) { // bolt away from whatever scared it: a tap on the glass or a chasing fish
          const cg = f.scare ? { cx: f.scare.x, cy: f.scare.y } : geo[F.indexOf(f.chaser)], awx = g.cx - cg.cx, awy = g.cy - cg.cy, dd = Math.hypot(awx, awy) || 1;
          f.tx = Math.max(4, Math.min(maxX, f.x + awx / dd * 160)); f.ty = Math.max(top, Math.min(maxY, f.y + awy / dd * 80)); boost = 2.4;
        } else if (f.follow && f.follow.mode !== "flee") { // school: stay beside the leader
          const L = f.follow, lg = geo[F.indexOf(L)];
          f.tx = Math.max(4, Math.min(maxX, L.tx + f.off[0])); f.ty = Math.max(top, Math.min(maxY, L.ty + f.off[1])); boost = Math.min(1.5, 0.9 + Math.hypot(lg.cx - g.cx, lg.cy - g.cy) / 160);
        } else if (f.tt <= 0 || Math.hypot(f.tx - f.x, f.ty - f.y) < 14) { // pick somewhere new to go (sometimes just a short drift)
          const far = f.rnd() < 0.7;
          f.tx = far ? 4 + f.rnd() * maxX : Math.max(4, Math.min(maxX, f.x + (f.rnd() - 0.5) * 120));
          f.ty = far ? top + f.rnd() * (maxY - top) : Math.max(top, Math.min(maxY, f.y + (f.rnd() - 0.5) * 60));
          if (sim.mood && sim.mood.hide) f.ty = Math.max(f.ty, top + (maxY - top) * (0.5 + 0.5 * f.rnd())); // nervous fish keep low, near the plants
          f.tt = 2.5 + f.rnd() * 4;
        }
        const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy) || 1, sp = f.sp * S * sim.moodSpeed * boost * Math.min(1, d / 50 + 0.3);
        const k = Math.min(1, dt * (boost > 1.5 ? 3 : 1.5));
        f.vx += (dx / d * sp - f.vx) * k + ax[i] * dt; f.vy += (dy / d * sp * 0.55 - f.vy) * k + ay[i] * dt;
        f.x += f.vx * dt; f.y += f.vy * dt;
        if (f.x < 0) { f.x = 0; f.vx = Math.abs(f.vx) * 0.3; f.tt = 0; } else if (f.x > maxX) { f.x = maxX; f.vx = -Math.abs(f.vx) * 0.3; f.tt = 0; }
        if (f.y < top) { f.y = top; f.vy = Math.abs(f.vy) * 0.3; } else if (f.y > maxY) { f.y = maxY; f.vy = -Math.abs(f.vy) * 0.3; }
        let want = 0; // which way it faces: toward the food when feeding, otherwise the way it swims (with a dead zone so it doesn't flip-flop)
        if (food && f.mode === "swim") want = food.x >= g.cx ? 1 : -1; else if (Math.abs(f.vx) > 8) want = f.vx > 0 ? 1 : -1;
        if (want) { f.face = want; const rate = (boost > 1.5 ? 9 : 5.5) * dt; f.turn += Math.max(-rate, Math.min(rate, want - f.turn)); }
        const dart = f.mode !== "swim"; if (dart !== f.dart) { f.dart = dart; f.turnEl.classList.toggle("dart", dart); }
      });
    }
    F.forEach(f => {
      const bob = Math.sin(sim.time * 1.7 + f.phase) * 1.6, tilt = Math.max(-22, Math.min(22, Math.atan2(f.vy, Math.max(Math.abs(f.vx), 14)) * 57.3)) - (f.eatT > 0 ? 16 : 0);
      const sc = S * (0.8 + 0.2 * f.depth);
      f.el.style.transform = `translate(${f.x.toFixed(1)}px, ${(f.y + bob).toFixed(1)}px)`;
      f.turnEl.style.transform = `scaleX(${(f.turn * sc).toFixed(3)}) scaleY(${sc.toFixed(3)}) rotate(${tilt.toFixed(1)}deg)`;
    });
  }
  // ---- 👆 Touch & 🌦 moods: tap the water and nearby fish bolt away (a ripple shows where); the fish's mood follows the weather where you are ----
  // Moods are only a feel: falling pressure = lively and hungry, a windy/stormy day = nervous and keeping low, hot midday = lazy, night = sleepy.
  function tankMood() {
    const hour = new Date().getHours(), wind = (typeof cond !== "undefined" && cond.windMph) || 0, tf = typeof cond !== "undefined" ? cond.tempF : null, tr = typeof cond !== "undefined" ? cond.pressureTrend : null;
    if (wind >= 22) return { key: "skittish", emoji: "😰", speed: 1.1, full: 1, hide: true, scare: 1.5, label: "Nervous — it's windy out, so the fish stay low and jumpy." };
    if (hour >= 21 || hour < 5) return { key: "sleepy", emoji: "😴", speed: 0.55, full: 1.2, hide: false, scare: 0.8, label: "Sleepy — it's night, so the fish drift slowly." };
    if (tr === "falling") return { key: "active", emoji: "🤩", speed: 1.3, full: 0.5, hide: false, scare: 1, label: "Lively and hungry — the pressure is falling, just like on a good bite day." };
    if (tf != null && tf >= 90 && hour >= 11 && hour <= 16) return { key: "lazy", emoji: "🥱", speed: 0.7, full: 1, hide: false, scare: 0.9, label: "Lazy — it's hot out, so the fish take it easy." };
    return { key: "calm", emoji: "😊", speed: 1, full: 1, hide: false, scare: 1, label: "Calm — nice, steady conditions." };
  }
  function tankMoodApply(sim) { sim.mood = tankMood(); sim.moodSpeed = sim.mood.speed; sim.moodT = 30; }
  function tankRipple(sim, x, y) {
    const e = el("span", "ripple"); e.style.left = x + "px"; e.style.top = y + "px"; sim.scene.appendChild(e); setTimeout(() => e.remove(), 800); snd("splash");
  }
  // Scare every fish within `R` of (x, y); closer fish bolt harder and for longer. Returns how many were startled.
  function tankStartle(sim, x, y, R) {
    let n = 0; const S = sim.scale, m = sim.mood ? sim.mood.scare : 1;
    sim.fish.forEach(f => {
      const w = f.w * S * (0.8 + 0.2 * f.depth), h = f.h * S * (0.8 + 0.2 * f.depth), d = Math.hypot(f.x + w / 2 - x, f.y + h / 2 - y), lim = R * S * m;
      if (d > lim) return;
      f.mode = "flee"; f.scare = { x, y }; f.chaser = null; f.prey = null; f.mt = 0.8 + (1 - d / lim) * 1.4; f.cool = Math.max(f.cool, 6); n++;
    });
    return n;
  }
  function tankTouchBind(sim) {
    const scene = sim.scene;
    scene.addEventListener("click", e => {
      if (sim.feedMode || sim.still) return;
      const r = scene.getBoundingClientRect(), x = e.clientX - r.left - scene.clientLeft, y = e.clientY - r.top - scene.clientTop;
      const hit = e.target.closest && e.target.closest(".tfish, .pfish");
      if (hit) { // tapping a fish: that one gives a startled wiggle (the details still open)
        const f = sim.fish.find(q => q.el === hit); if (f) { const g = f.w * sim.scale * 0.5; tankStartle(sim, f.x + g - f.face * 28 * sim.scale, f.y + f.h * sim.scale * 0.5, 30); }
        return;
      }
      if (e.target.closest && e.target.closest("button, a")) return;
      tankRipple(sim, x, y); tankStartle(sim, x, y, 150);
    });
  }
  // ---- 🍤 Hand feeding: touch and drag inside the tank to hold a pinch of food; hungry fish come and nibble it from your fingertip ----
  // The pinch holds 6 flakes (one comes back every ~1.1 s while you hold). Each bite uses a flake, a fish that has eaten 5 times is full for
  // 25–40 s. Let go and the flakes sprinkle down; fish eat those off the way down. Nothing is saved — just play.
  function tankPop2(sim, x, y) { // a tiny puff where a bite happened
    snd("nibble"); const e = el("span", "bite-pop"); e.style.left = x + "px"; e.style.top = y + "px"; sim.scene.appendChild(e); setTimeout(() => e.remove(), 500);
  }
  function tankCrumb(sim, x, y) {
    if (sim.crumbs.length >= 40) { const o = sim.crumbs.shift(); if (o.el) o.el.remove(); }
    const c = { x, y, el: el("span", "crumb"), rest: 0, dead: false }; c.el.style.transform = `translate(${x}px, ${y}px)`; sim.scene.appendChild(c.el); sim.crumbs.push(c);
  }
  function tankFoodStep(sim, dt) {
    const S = sim.scale, floorY = sim.H - sim.floor - 5;
    if (sim.feed) {
      const fd = sim.feed;
      if (fd.supply < 6) { fd.refill += dt; if (fd.refill >= 1.1) { fd.refill = 0; fd.supply += 1; } } else fd.refill = 0;
      fd.drip -= dt; if (fd.drip <= 0) { fd.drip = 0.5; tankCrumb(sim, fd.x + (sim.time * 37 % 11) - 5, fd.y + 10); }
    }
    sim.crumbs.forEach(c => {
      if (c.y < floorY) c.y = Math.min(floorY, c.y + 22 * S * dt); else c.rest += dt;
      if (c.rest > 7) c.dead = true;
      c.el.style.transform = `translate(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px)`; c.el.style.opacity = c.rest > 5 ? String(Math.max(0, (7 - c.rest) / 2)) : "";
    });
    if (sim.crumbs.some(c => c.dead)) { sim.crumbs = sim.crumbs.filter(c => { if (c.dead) c.el.remove(); return !c.dead; }); }
    if (sim.feed) {
      if (!sim.foodEl) { const f = el("div", "food"); f.appendChild(el("span", "food-thumb")); f.appendChild(el("span", "food-finger")); const fl = el("span", "food-flakes"); for (let i = 0; i < 6; i++) fl.appendChild(el("i")); f.appendChild(fl); sim.scene.appendChild(f); sim.foodEl = f; }
      sim.foodEl.style.transform = `translate(${sim.feed.x.toFixed(1)}px, ${sim.feed.y.toFixed(1)}px)`;
      [...sim.foodEl.querySelectorAll("i")].forEach((d, i) => { d.style.opacity = i < sim.feed.supply ? "1" : "0.12"; });
    } else if (sim.foodEl) { sim.foodEl.remove(); sim.foodEl = null; }
  }
  const tankFeedBegin = (sim, x, y) => { snd("plop"); sim.feed = { x, y, supply: 6, refill: 0, drip: 0.6 }; tankFoodStep(sim, 0); };
  const tankFeedMove = (sim, x, y) => { if (sim.feed) { sim.feed.x = Math.max(4, Math.min(sim.W - 4, x)); sim.feed.y = Math.max(4, Math.min(sim.H - sim.floor - 4, y)); } };
  function tankFeedEnd(sim) { // let go: sprinkle what is left
    if (!sim.feed) return;
    const fd = sim.feed; sim.feed = null; snd("plop");
    for (let i = 0; i < Math.max(3, Math.round(fd.supply)); i++) tankCrumb(sim, fd.x + (i - 3) * 6, fd.y + (i % 3) * 5);
    tankFoodStep(sim, 0);
  }
  // Turn feeding mode on/off for a tank and keep every "Feed the fish" button for it in step.
  function tankFeedMode(scene, on) {
    const sim = scene.__sim; if (!sim) return;
    sim.feedMode = on; scene.classList.toggle("feeding-mode", on);
    if (!on) tankFeedEnd(sim);
    sim.feedBtns.forEach(b => { b.textContent = on ? "✋ Done feeding" : "🍤 Feed the fish"; b.setAttribute("aria-pressed", String(on)); });
    if (on && !sim.hintEl && scene.parentNode && !scene.closest(".tank-full")) { sim.hintEl = el("div", "spot-meta feed-hint", "Touch and drag inside the tank to hold the food. Hungry fish will come and nibble."); scene.parentNode.insertBefore(sim.hintEl, scene.nextSibling); }
    if (!on && sim.hintEl) { sim.hintEl.remove(); sim.hintEl = null; }
  }
  function tankFeedBind(scene) {
    const sim = scene.__sim; if (!sim) return;
    const pos = e => { const r = scene.getBoundingClientRect(); return [e.clientX - r.left - scene.clientLeft, e.clientY - r.top - scene.clientTop]; };
    scene.addEventListener("pointerdown", e => { if (!sim.feedMode) return; e.preventDefault(); try { scene.setPointerCapture(e.pointerId); } catch (x) { /* fine */ } const [x, y] = pos(e); tankFeedBegin(sim, x, y); tankFeedMove(sim, x, y); });
    scene.addEventListener("pointermove", e => { if (!sim.feedMode || !sim.feed) return; e.preventDefault(); const [x, y] = pos(e); tankFeedMove(sim, x, y); });
    ["pointerup", "pointercancel"].forEach(t => scene.addEventListener(t, () => { if (sim.feedMode) tankFeedEnd(sim); }));
  }
  const feedBtn = (scene, canFeed) => {
    const b = el("button", "btn ghost feed-btn", "🍤 Feed the fish"); b.type = "button"; b.setAttribute("aria-pressed", "false");
    const sim = scene.__sim; if (sim) sim.feedBtns.push(b);
    if (sim && sim.still) { b.disabled = true; b.title = "Your phone is set to reduce motion, so the fish stay still."; b.textContent = "🍤 Feeding needs motion"; return b; }
    b.addEventListener("click", () => tankFeedMode(scene, !(scene.__sim && scene.__sim.feedMode)));
    return b;
  };
  function tankTick(now) {
    tankRaf = 0;
    const dt = Math.min(0.05, ((now - tankLast) / 1000) || 0); tankLast = now;
    TANK_SIMS.forEach(s => { if (!s.scene.isConnected) { TANK_SIMS.delete(s); return; } if (s.visible && !document.hidden) tankStep(s, dt); });
    if (TANK_SIMS.size) tankRaf = requestAnimationFrame(tankTick);
  }
  // Full-screen view of a tank / pond / lagoon: the scene itself moves into a screen-filling layer and goes back on close.
  function tankFull(scene, title, canFeed) {
    const home = scene.parentNode, next = scene.nextSibling, oldH = scene.style.height, prev = document.activeElement, oldOv = document.body.style.overflow;
    const bg = el("div", "tank-full"); bg.setAttribute("role", "dialog"); bg.setAttribute("aria-modal", "true"); bg.setAttribute("aria-label", title);
    const bar = el("div", "tf-bar"), close = el("button", "btn", "✕ Close"); close.type = "button";
    bar.appendChild(el("b", null, title)); const sb = sndButton(); bar.appendChild(sb); bar.appendChild(close);
    const stage = el("div", "tf-stage"), info = el("div", "tank-info tf-info"); info.hidden = true; info.setAttribute("role", "status");
    scene.style.height = "100%"; stage.appendChild(scene);
    const foot = el("div", "tf-foot"); foot.appendChild(info);
    let fb = null; if (canFeed) { fb = feedBtn(scene, true); if (scene.__sim && scene.__sim.feedMode) { fb.textContent = "✋ Done feeding"; fb.setAttribute("aria-pressed", "true"); } foot.appendChild(fb); }
    bg.appendChild(bar); bg.appendChild(stage); bg.appendChild(foot);
    document.body.style.overflow = "hidden"; document.body.appendChild(bg);
    let gotFs = false, closed = false;
    const refit = () => { if (scene.__sim) scene.__sim.resize(); };
    const end = () => {
      if (closed) return; closed = true;
      document.removeEventListener("keydown", key, true); document.removeEventListener("fullscreenchange", fsc); window.removeEventListener("resize", refit); window.removeEventListener("orientationchange", refit);
      try { if (document.fullscreenElement === bg && document.exitFullscreen) document.exitFullscreen().catch(() => {}); } catch (e) { /* fine */ }
      if (fb && scene.__sim) scene.__sim.feedBtns = scene.__sim.feedBtns.filter(x => x !== fb);
      scene.style.height = oldH; home.insertBefore(scene, next && next.parentNode === home ? next : null); bg.remove(); document.body.style.overflow = oldOv; refit();
      if (prev && prev.focus) { try { prev.focus(); } catch (e) { /* fine */ } }
    };
    const key = e => { if (e.key === "Escape") { e.preventDefault(); end(); } };
    const fsc = () => { if (gotFs && !document.fullscreenElement) end(); };
    document.addEventListener("keydown", key, true); document.addEventListener("fullscreenchange", fsc);
    window.addEventListener("resize", refit); window.addEventListener("orientationchange", refit);
    close.addEventListener("click", end);
    try { const r = bg.requestFullscreen && bg.requestFullscreen(); if (r && r.then) r.then(() => { gotFs = true; refit(); }).catch(() => {}); } catch (e) { /* the filled-screen layer still works */ }
    refit(); setTimeout(refit, 60); close.focus();
    return { end, info };
  }
  const fullBtn = (scene, title, canFeed) => { const b = el("button", "btn ghost full-btn", "⛶ Full screen"); b.type = "button"; b.addEventListener("click", () => tankFull(scene, title, canFeed)); return b; };

  function tankMoodLine() { const m = tankMood(); const d = el("div", "spot-meta tank-mood", m.emoji + " " + m.label + " Tap the water to make them dart."); d.dataset.mood = m.key; return d; }
  function tankDraw(kind, data, box, opts) {
    opts = opts || {};
    const salt = kind === "salt", fish = data.fish, view = opts.view || { id: kind, kind, base: true, title: salt ? "Saltwater tank" : "Freshwater tank" };
    const card = el("div", "tank-card"); card.dataset.tank = view.id;
    const icon = salt ? "🌊" : "🌿", mineOwn = opts.own && !opts.other;
    if (!fish.length) {
      card.appendChild(el("div", "label", icon + " " + view.title));
      if (!view.base) card.appendChild(el("div", "spot-meta", "No fish in this tank yet. Tap 🐟 Choose fish to move some of your best " + (salt ? "saltwater" : "freshwater") + " catches here."));
      else if (opts.movedAll) card.appendChild(el("div", "spot-meta", "All your " + (salt ? "saltwater" : "freshwater") + " fish are swimming in your other tanks."));
      else card.appendChild(emptyBox(salt ? "No saltwater fish yet. Your best catch of each saltwater species will swim here." : "No freshwater fish yet. Your best catch of each freshwater species will swim here.", "📸 Log a catch", () => { $("qc-fab").click(); }));
      if (mineOwn) tankNameTools(card, view, opts);
      box.appendChild(card); return;
    }
    const tank = el("div", "tank " + (salt ? "tank-salt" : "tank-fresh"));
    tank.style.height = Math.min(620, 440 + Math.ceil(fish.length / 2) * 20) + "px";   // about twice the old size (plans/ui-review.md 4A)
    // Nicer finish (plans/ui-review.md 4B): an air stone in the corner sends up a column of bubbles; glass shine and the cabinet are CSS
    for (let i = 0; i < 5; i++) { const b = el("span", "bubble stone"); b.style.left = (salt ? 90 : 7) + (i % 2) + "%"; b.style.animationDelay = (i * 0.9) + "s"; b.style.animationDuration = (4 + (i % 3)) + "s"; b.setAttribute("aria-hidden", "true"); tank.appendChild(b); }
    for (let i = 0; i < 6; i++) { const b = el("span", "bubble"); b.style.left = (8 + i * 16) + "%"; b.style.animationDelay = (i * 1.3) + "s"; b.style.animationDuration = (7 + (i % 3) * 2) + "s"; b.setAttribute("aria-hidden", "true"); tank.appendChild(b); }
    const items = [];
    fish.forEach((f, i) => {
      const px = tankPx(f.catchRow);
      const b = el("button", "tfish sim"); b.type = "button";
      b.setAttribute("aria-label", `${f.species}, ${tankFishText(f) || "no size logged"}. Press Enter for details.`);
      const turnEl = el("span", "tf-turn"); turnEl.appendChild(fishSvg(f.species, px, i < 20)); b.appendChild(turnEl); // only the first 20 get moving parts (phone speed)
      b.addEventListener("click", () => { const fs = tank.closest(".tank-full"); tankInfo(f, kind, fs ? fs.querySelector(".tf-info") : info, opts); });
      tank.appendChild(b);
      items.push({ el: b, turnEl, w: px, h: Math.round(px * 68 / 128), depth: [0.25, 0.6, 1][i % 3], kind: f.key });
    });
    const sandEl = el("div", "tank-sand"); sandEl.setAttribute("aria-hidden", "true"); tank.appendChild(sandEl);
    // Decorations are earned: one more for every couple of species in this tank (so friends see the same ones on your profile)
    const deco = TANK_DECOR[salt ? "salt" : "fresh"], got = deco.filter(d => fish.length >= d.at);
    got.forEach((d, i) => { const e = el("span", "decor", d.e); e.style.left = (5 + i * (76 / Math.max(deco.length - 1, 1))) + "%"; e.style.fontSize = d.sz + "px"; e.title = d.n; e.setAttribute("aria-hidden", "true"); tank.appendChild(e); });
    // Spoken description: the tank is a labelled group; its fish are buttons; the decorations are read out in the label (they are only pictures)
    tank.setAttribute("role", "group"); tank.dataset.a11y = `${view.name ? view.name + ", a " + (salt ? "saltwater" : "freshwater") + " tank" : view.title} with ${fish.length} species. Tab to a fish and press Enter for its details.`; tank.dataset.decor = got.map(d => d.n).join(", ");
    // The cabinet: the tank sits in a dark frame with a name plaque under the glass ("Snook Corner · 6 fish", or "Saltwater tank · 6 fish" with no name)
    const cab = el("div", "tank-cab"); cab.appendChild(tank);
    cab.appendChild(el("div", "tank-plaque", `${view.title} · ${fish.length} fish`));
    card.appendChild(cab);
    tankApplySetup(tank, opts.setup);
    tankSwim(tank, items, { seed: salt ? 1 : 2, chase: true });
    const nxt = deco.find(d => fish.length < d.at);
    card.appendChild(el("div", "spot-meta", got.length ? `${got.length} of ${deco.length} decorations unlocked` + (nxt ? ` · next one at ${nxt.at} species` : " — tank fully decorated! 🎉") : `First decoration unlocks at ${deco[0].at} species.`));
    card.appendChild(tankMoodLine());
    const acts = el("div", "tank-actions");
    if (!opts.other) { tankFeedBind(tank); acts.appendChild(feedBtn(tank, true)); }
    acts.appendChild(fullBtn(tank, icon + " " + view.title, !opts.other));
    if (mineOwn) { const cb = el("button", "btn ghost custom-btn", "🎨 Customize"); cb.type = "button"; cb.addEventListener("click", () => { if (!shop.ready) { if (typeof toast === "function") toast("Opening your items…"); shopLoad().then(() => tankCustomize(view, tank, card)); } else tankCustomize(view, tank, card); }); acts.appendChild(cb); }
    card.appendChild(acts);
    if (mineOwn) tankNameTools(card, view, opts);
    else if (opts.other && view.name && opts.ownerId && typeof adminCan === "function" && adminCan("reports")) tankHideName(card, view, opts.ownerId);
    const info = el("div", "tank-info"); info.hidden = true; info.setAttribute("role", "status"); card.appendChild(info);
    box.appendChild(card);
  }
  // Decorations that unlock as a tank fills up (at = number of species in that tank)
  const TANK_DECOR = {
    salt: [{ at: 2, e: "🌿", n: "Seaweed", sz: 26 }, { at: 4, e: "🐚", n: "Shell", sz: 20 }, { at: 6, e: "⚓", n: "Anchor", sz: 24 }, { at: 8, e: "🪸", n: "Coral", sz: 28 }, { at: 10, e: "🏰", n: "Castle", sz: 32 }],
    fresh: [{ at: 2, e: "🌿", n: "Water plant", sz: 26 }, { at: 4, e: "🪨", n: "Rock", sz: 22 }, { at: 6, e: "🪷", n: "Lily", sz: 26 }, { at: 8, e: "🏺", n: "Old jar", sz: 26 }, { at: 10, e: "🏰", n: "Castle", sz: 32 }]
  };
  function tankInfo(f, kind, i, opts) {
    const c = f.catchRow; i.innerHTML = ""; i.hidden = false;
    i.appendChild(el("div", "tank-info-t", `${kind === "salt" ? "🌊" : "🌿"} ${f.species}`));
    i.appendChild(el("div", null, tankFishText(f) || "No size logged for this one"));
    const when = c.caught_at ? new Date(c.caught_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
    i.appendChild(el("div", "spot-meta", ((opts && opts.other) ? "Their best — " : "Your best — ") + [when, f.spotName && !(opts && opts.noSpot) ? "at " + f.spotName : ""].filter(Boolean).join(" ")));
    rankFill(i, c, () => !i.hidden && i.firstChild && i.firstChild.textContent.includes(f.species));
    if (f.pondCount) i.appendChild(el("div", "spot-meta", `${f.pondCount} smaller ${f.species} in the ${kind === "salt" ? "lagoon" : "pond"}`));
  }
  // Overflow fish live in their own scene: freshwater -> the pond, saltwater -> the lagoon (a count per species below it).
  function overflowDraw(t, kind, box) {
    const salt = kind === "salt", rows = t[kind].pond.slice().sort((a, b) => b.n - a.n);
    const total = rows.reduce((n, p) => n + p.n, 0), card = el("div", "tank-card");
    card.appendChild(el("div", "label", salt ? "🌴 Your lagoon" : "🏞 Your pond"));
    if (!total) { card.appendChild(emptyBox(salt ? "The lagoon is empty. When you catch a second fish of a saltwater species, the smaller one swims here and your best stays in the saltwater tank." : "The pond is empty. When you catch a second fish of a freshwater species, the smaller one swims here and your best stays in the freshwater tank.", "📸 Log a catch", () => { $("qc-fab").click(); })); box.appendChild(card); return; }
    const scene = el("div", salt ? "pond-scene lagoon-scene" : "pond-scene"); scene.style.height = "230px";
    scene.setAttribute("role", "img"); scene.setAttribute("aria-label", `${salt ? "Your lagoon" : "Your pond"}: ${total > 40 ? "40 of your " + total : total} fish swimming. The list below gives how many of each kind.`);
    [[8, 14, 46], [70, 62, 56], [38, 76, 38], [84, 20, 34]].forEach(([l, tp, w]) => { const d = el("span", salt ? "weed" : "pad"); d.style.cssText = `left:${l}%;top:${tp}%;width:${salt ? Math.round(w * .5) : w}px;height:${salt ? w + 20 : Math.round(w * .72)}px`; scene.appendChild(d); });
    const fishList = []; rows.forEach(p => { for (let k = 0; k < p.n; k++) fishList.push(p.species); });
    let shown = 0; const items = [];
    fishList.slice(0, 40).forEach((sp, i) => {
      const b = el("span", "pfish sim"), turnEl = el("span", "tf-turn"); turnEl.appendChild(fishSvg(sp, 30)); b.appendChild(turnEl); scene.appendChild(b); shown++;
      items.push({ el: b, turnEl, w: 30, h: 16, depth: [0.3, 0.65, 1][i % 3], kind: sp.toLowerCase() });
    });
    card.appendChild(scene);
    tankSwim(scene, items, { floor: salt ? 30 : 6, speed: 22, seed: salt ? 3 : 4 });
    card.appendChild(tankMoodLine());
    const acts = el("div", "tank-actions"); acts.appendChild(fullBtn(scene, salt ? "🌴 Your lagoon" : "🏞 Your pond", false)); card.appendChild(acts);
    if (total > shown) card.appendChild(el("div", "spot-meta", `Showing ${shown} of ${total} fish`));
    const list = el("div", "pond-list");
    rows.forEach(p => { const r = el("div", "pond-row"); const pf = el("span", "pf"); pf.appendChild(fishSvg(p.species, 34)); r.appendChild(pf); r.appendChild(el("span", "pond-sp", p.species)); r.appendChild(el("b", null, "×" + p.n)); list.appendChild(r); });
    card.appendChild(list);
    box.appendChild(card);
  }
  let tankMode = "tanks";
  function renderTank() {
    const box = $("tank-body"), pbox = $("pond-body"), lbox = $("lagoon-body"), sbox = $("shop-body"); if (!box) return; box.innerHTML = ""; pbox.innerHTML = ""; lbox.innerHTML = ""; if (sbox) sbox.innerHTML = "";
    { const sr = $("tank-snd-row"); if (sr && !sr.firstChild) { const sb = sndButton(); sb.classList.add("snd-icon"); sr.appendChild(sb); sndButtons(); } }
    document.querySelectorAll("#tank-sw button").forEach(b => { b.classList.toggle("on", b.dataset.mode === tankMode); b.setAttribute("aria-pressed", String(b.dataset.mode === tankMode)); });
    box.hidden = tankMode !== "tanks"; pbox.hidden = tankMode !== "pond"; lbox.hidden = tankMode !== "lagoon"; if (sbox) sbox.hidden = tankMode !== "shop";
    if (me && !shop.ready && !shop.loading) shopLoad().then(() => renderTank());
    if (!me || spots === null) { box.appendChild(el("div", "empty", "Loading your catches…")); return; }
    const mine = Object.values(catchesBySpot).flat().filter(c => c.created_by === me.id && !c.deleted_at);
    const t = tankBuild(mine, spots), n = t.salt.fish.length + t.fresh.fish.length;
    const sum = x => x.pond.reduce((s, p) => s + p.n, 0);
    $("tank-sum").textContent = n ? `${n} species in your tanks · ${t.salt.fish.length} saltwater · ${t.fresh.fish.length} freshwater · ${sum(t.salt)} in the lagoon · ${sum(t.fresh)} in the pond` : "Log a catch and your first fish appears.";
    walletDraw(); tankClaim();
    tankViews(t, shop.setups).forEach(v => tankDraw(v.kind, v.data, box, { own: true, setup: v.setup, view: v, movedAll: v.base && t[v.kind].fish.length > 0, all: t }));
    moreTanksDraw(box); collectionDraw(mine, box); overflowDraw(t, "fresh", pbox); overflowDraw(t, "salt", lbox);
    if (sbox && tankMode === "shop") shopDraw(sbox);
  }
  document.querySelectorAll("#tank-sw button").forEach(b => b.addEventListener("click", () => { tankMode = b.dataset.mode; renderTank(); }));
  // ⓘ: the tank explanation, your counts, today's coins and how to earn them (folded so the tank starts near the top)
  { const hb = $("tank-help-btn"), hp = $("tank-help"); if (hb && hp) hb.addEventListener("click", () => { hp.hidden = !hp.hidden; hb.setAttribute("aria-expanded", String(!hp.hidden)); hb.classList.toggle("on", !hp.hidden); }); }

  // ---- 🔊 Tank sound: tiny sounds made in the browser (no files). OFF until the person taps 🔊, remembered on this phone, mute button always visible ----
  const tankSnd = { on: false, ctx: null, amb: null, last: {}, timer: 0 };
  try { tankSnd.on = localStorage.getItem("fm-tank-sound") === "1"; } catch (e) { /* fine */ }
  function sndCtx() { // phones only allow sound after a tap, so this is first called from the button
    if (tankSnd.ctx) return tankSnd.ctx;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    try { tankSnd.ctx = new AC(); } catch (e) { return null; }
    return tankSnd.ctx;
  }
  function sndBlip(c, t, f0, f1, dur, vol, type) { // one short tone that glides from f0 to f1 Hz
    const o = c.createOscillator(), g = c.createGain(); o.type = type || "sine";
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function sndNoise(c, secs) { const n = Math.floor(c.sampleRate * secs), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return b; }
  const SND = {
    bubble(c, t) { const f = 300 + Math.random() * 500; sndBlip(c, t, f, f * 1.8, 0.09, 0.07); },
    plop(c, t) { sndBlip(c, t, 420, 110, 0.14, 0.16); },
    nibble(c, t) { sndBlip(c, t, 900 + Math.random() * 300, 500, 0.035, 0.05, "triangle"); },
    splash(c, t) { const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = sndNoise(c, 0.3); f.type = "bandpass"; f.frequency.value = 900; f.Q.value = 0.7;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28); s.connect(f); f.connect(g); g.connect(c.destination); s.start(t); s.stop(t + 0.3); },
    chest(c, t) { sndBlip(c, t, 130, 90, 0.35, 0.09, "sawtooth"); [0, 1, 2, 3].forEach(i => sndBlip(c, t + 0.28 + i * 0.07, 520 + i * 160, 700 + i * 160, 0.12, 0.05)); },
    coin(c, t) { sndBlip(c, t, 988, 988, 0.1, 0.09, "square"); sndBlip(c, t + 0.09, 1319, 1319, 0.22, 0.09, "square"); }
  };
  const SND_GAP = { bubble: 60, plop: 120, nibble: 140, splash: 150, chest: 800, coin: 400 }; // so a crowd of events cannot turn into noise
  function snd(name) {
    if (!tankSnd.on) return;
    const now = Date.now(); if (now - (tankSnd.last[name] || 0) < (SND_GAP[name] || 100)) return; tankSnd.last[name] = now;
    const c = sndCtx(); if (!c || !SND[name]) return;
    try { if (c.state === "suspended") c.resume(); SND[name](c, c.currentTime + 0.01); } catch (e) { /* sound is never worth a crash */ }
  }
  function sndAmbience(play) { // a very quiet water hum while the Tank tab is open
    const c = tankSnd.ctx; if (!c) return;
    if (!tankSnd.amb) {
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
      s.buffer = sndNoise(c, 3); s.loop = true; f.type = "lowpass"; f.frequency.value = 380; g.gain.value = 0;
      lfo.frequency.value = 0.15; lg.gain.value = 120; lfo.connect(lg); lg.connect(f.frequency);
      s.connect(f); f.connect(g); g.connect(c.destination); s.start(); lfo.start(); tankSnd.amb = g;
    }
    try { tankSnd.amb.gain.setTargetAtTime(play ? 0.06 : 0, c.currentTime, 0.4); } catch (e) { /* fine */ }
  }
  function sndWatch() { // keeps the hum on only while sound is on, the page is showing, and the Tank tab is open
    const v = document.getElementById("view-tank");
    sndAmbience(tankSnd.on && !document.hidden && !!v && !v.hidden);
  }
  function sndSet(on) {
    tankSnd.on = on; try { localStorage.setItem("fm-tank-sound", on ? "1" : "0"); } catch (e) { /* fine */ }
    if (on) { const c = sndCtx(); if (c && c.state === "suspended") c.resume(); if (!tankSnd.timer) tankSnd.timer = setInterval(sndWatch, 1500); sndWatch(); snd("bubble"); }
    else { sndAmbience(false); if (tankSnd.timer) { clearInterval(tankSnd.timer); tankSnd.timer = 0; } }
    sndButtons();
  }
  function sndButtons() { document.querySelectorAll(".snd-btn").forEach(b => { const ic = b.classList.contains("snd-icon"); b.textContent = ic ? (tankSnd.on ? "🔊" : "🔇") : tankSnd.on ? "🔊 Sound on" : "🔇 Sound off"; if (ic) b.setAttribute("aria-label", "Tank sound"); b.setAttribute("aria-pressed", String(tankSnd.on)); }); }
  function sndButton() { // a mute button (also used inside full screen)
    const b = el("button", "btn small ghost snd-btn"); b.type = "button"; b.addEventListener("click", () => sndSet(!tankSnd.on)); b.textContent = tankSnd.on ? "🔊 Sound on" : "🔇 Sound off"; b.setAttribute("aria-pressed", String(tankSnd.on)); return b;
  }
  if (tankSnd.on) tankSnd.timer = setInterval(sndWatch, 1500); // returning visitors who turned it on: it only makes noise after their first tap (phones insist)

  // ---- 🪙 Coins & 💎 gems: earned from photographed catches, new species/bests, finished collections and official tournaments ----
  // All the rules and the daily limit live in the database (setup/41); the app only asks "claim_coins" and shows the result.
  // Gems are earned only. The shop that spends them comes next (simulator step 7).
  let wallet = null, walletBusy = false, walletAt = 0;
  const COIN_WHY = { catch: "photographed catch", measured: "measured it", species: "new species", best: "new personal best", collection: "finished a collection", tournament: "tournament placing", purchase: "bought", race: "won a fish race", race_fee: "race entry fee", race_prize: "race prize", race_refund: "race fee back", challenge: "weekly challenge", challenge_week: "all weekly challenges done" };
  const COIN_GROUPS = { inshore: "Inshore", beach: "Beach & pier", offshore: "Offshore", fresh: "Freshwater" };
  function walletToast(added) {
    if (!added || !added.length) return;
    const coins = added.reduce((a, x) => a + (x.coins || 0), 0), gems = added.reduce((a, x) => a + (x.gems || 0), 0);
    const why = [...new Set(added.map(x => COIN_WHY[x.reason] || x.reason))].join(", ");
    snd("coin");
    if (typeof toast === "function") toast(`🪙 +${coins}${gems ? " · 💎 +" + gems : ""} — ${why}`, 5000);
  }
  // After a tournament placing: say which trophy cup just landed (it is in the user's items, created in the last 2 minutes)
  async function cupToast() {
    try {
      if (!me || !db || typeof toast !== "function") return;
      const since = new Date(Date.now() - 120000).toISOString();
      const { data, error } = await db.from("user_items").select("item_key").eq("user_id", me.id).gte("created_at", since);
      if (error) return;
      const cups = (data || []).map(x => x.item_key).filter(k => /^trophy_/.test(k));
      if (!cups.length) return;
      const nm = k => (typeof SHOP_ART !== "undefined" && SHOP_ART[k] && SHOP_ART[k].n) || "trophy cup";
      toast("🏆 You won the " + cups.map(nm).join(" and the ") + "! Place it with 🎨 Customize on a tank.", 6000);
    } catch (e) { /* the cup is still in the shop list; the message is only a bonus */ }
  }
  async function tankClaim(force) {
    if (walletBusy || !me || !db || !db.rpc) return;
    if (!force && Date.now() - walletAt < 45000) return;
    walletBusy = true;
    try {
      const r = await db.rpc("claim_coins"); if (r.error || !r.data || typeof r.data.coins !== "number") throw (r.error || new Error("no wallet"));
      wallet = r.data; walletAt = Date.now(); walletToast(wallet.added); walletDraw();
      if (typeof chClaim === "function") chClaim();   // weekly challenges (js/68) pay out on the same check
      if ((wallet.added || []).some(x => x.reason === "tournament")) { shop.ready = false; setTimeout(cupToast, 5200); } // a trophy cup may have arrived: reload what you own + tell the winner
      // finished collection groups: ask once per group (the server checks every species has a photographed catch)
      const mine = Object.values(catchesBySpot || {}).flat().filter(c => c.created_by === me.id && !c.deleted_at);
      for (const g of tankCollection(mine)) {
        if (g.total < 5 || g.got.length !== g.total || (wallet.collections || []).includes(g.key)) continue;
        const alts = g.got.map(n => [...new Set(mine.filter(c => { const f = seasonFor(c.species); return f && f.name === n; }).map(c => c.species))]);
        const c2 = await db.rpc("claim_collection", { p_group: g.key, p_species: alts });
        if (!c2.error && c2.data && typeof c2.data.coins === "number") { wallet = c2.data; walletToast(wallet.added); walletDraw(); }
      }
    } catch (e) { /* offline, or not signed in yet: no coins right now, nothing is lost — they are claimed next time */ }
    walletBusy = false;
  }
  function walletDraw() {
    const box = $("wallet-box"); if (!box) return; box.innerHTML = "";
    const more = $("wallet-more") || box; if (more !== box) more.innerHTML = "";   // Play: the pills sit in the title line, the rest inside ⓘ
    if (!wallet) return;
    const row = el("div", "wallet-row");
    const chip = (e, n, t) => { const c = el("span", "coin-chip"); c.title = t; c.setAttribute("role", "img"); c.setAttribute("aria-label", `${n} ${e === "💎" ? "gems" : "coins"}`); c.appendChild(el("span", "", e)); c.appendChild(el("b", "", String(n))); return c; };
    row.appendChild(chip("🪙", wallet.coins, "Coins")); row.appendChild(chip("💎", wallet.gems, "Gems — earned only, never sold"));
    box.appendChild(row);
    more.appendChild(el("div", "spot-meta", `Today: ${wallet.today} of ${wallet.cap} catch coins`));
    const det = el("details", "wallet-more"); det.appendChild(el("summary", "", "How do I earn coins and gems?"));
    ["🪙 2 for every catch you log with a photo (+1 if you measure it) — up to 50 a day.",
      "🪙 40 the first time you catch a species · 🪙 25 for a new personal best (3 a day at most).",
      "🪙 150 + 💎 2 when you finish a collection.",
      "🏆 Official tournaments, top 3: 🪙 200 / 120 / 80 and 💎 3 / 2 / 1.",
      "🎯 Weekly challenges (on Compete): 🪙 20–40 each, and 💎 2 when you finish all of them before the week ends.",
      "💎 Gems can only be earned — they are never for sale. The shop where you spend them is coming soon."].forEach(t => det.appendChild(el("div", "spot-meta", t)));
    if ((wallet.recent || []).length) {
      det.appendChild(el("div", "label wallet-h", "Recent"));
      wallet.recent.forEach(r => det.appendChild(el("div", "spot-meta", `${r.currency === "gems" ? "💎" : "🪙"} ${r.amount > 0 ? "+" : "−"}${Math.abs(r.amount)} — ${r.reason === "collection" || r.reason === "tournament" ? (COIN_WHY[r.reason] + (r.note ? ": " + (COIN_GROUPS[r.note] || r.note) : "")) : (COIN_WHY[r.reason] || r.reason) + (r.note ? " · " + r.note : "")}`)));
    }
    more.appendChild(det);
  }
  // ---- 🛍 Shop & 🎨 Customize: gravel colors and pieces you buy (coins/gems) or win, placed in your tanks and saved to your account (setup/42) ----
  // Prices and what you own live in the database; this is only the pictures (emoji for now — artist art can replace SHOP_ART entry by entry).
  const GRAVEL = { sand: ["#e6d3a1", "#c9b078", "Natural sand"], gravel_black: ["#55555c", "#2c2c31"], gravel_blue: ["#6fa8dc", "#3b6ea5"], gravel_green: ["#8fbc6f", "#4f8a3b"], gravel_pink: ["#f3a6c3", "#d4709a"], gravel_white: ["#f4f1ea", "#d8d2c4"] };
  const SHOP_ART = {
    wood_small: { e: "🪵", sz: 26, n: "Small driftwood" }, wood_big: { e: "🪵", sz: 46, n: "Big driftwood" },
    plant_grass: { e: "🌾", sz: 36, n: "Sea grass" }, plant_kelp: { e: "🌿", sz: 58, f: "hue-rotate(35deg) saturate(1.4)", n: "Kelp" },
    plant_leafy: { e: "🍃", sz: 34, n: "Leafy water plant" }, plant_fern: { e: "🌿", sz: 38, n: "Water fern" }, plant_lily: { e: "🪷", sz: 28, n: "Lily pads" },
    rock_small: { e: "🪨", sz: 22, n: "Small rocks" }, rock_pile: { e: "🪨", sz: 40, n: "Boulder pile" }, rock_arch: { e: "🪨", sz: 58, f: "contrast(1.1)", n: "Rock arch" },
    coral_brain: { e: "🪸", sz: 32, f: "hue-rotate(300deg)", n: "Brain coral" }, coral_fan: { e: "🪸", sz: 42, n: "Sea fan" }, coral_branch: { e: "🪸", sz: 52, f: "hue-rotate(40deg) saturate(1.3)", n: "Staghorn coral" },
    shell_scallop: { e: "🦪", sz: 22, n: "Scallop shell" }, shell_conch: { e: "🐚", sz: 24, n: "Conch shell" },
    diver: { e: "🤿", sz: 40, n: "Diver figurine" }, chest: { e: "💰", sz: 36, n: "Treasure chest", chest: true },
    trophy_gold: { e: "🏆", sz: 32, n: "Gold trophy cup" }, trophy_silver: { e: "🏆", sz: 30, f: "grayscale(1) brightness(1.25)", n: "Silver trophy cup" }, trophy_bronze: { e: "🏆", sz: 28, f: "sepia(1) saturate(2) hue-rotate(-15deg)", n: "Bronze trophy cup" }
  };
  const SHOP_CATS = [["gravel", "Gravel colors"], ["wood", "Driftwood"], ["plant", "Plants"], ["rock", "Rocks"], ["coral", "Coral"], ["shell", "Shells"], ["diver", "Diver"], ["chest", "Treasure chest"], ["trophy", "Trophy cups"]];
  const shop = { ready: false, loading: false, items: {}, owned: new Set(), setups: { salt: null, fresh: null, extras: [], place: {} } };
  async function shopLoad() {
    if (!me || !db || shop.loading) return; shop.loading = true;
    try {
      const [it, ow, su, ut, ts] = await Promise.all([db.from("shop_items").select("*").order("sort"), db.from("user_items").select("item_key").eq("user_id", me.id), db.from("tank_setups").select("tank,gravel,placed,name,name_hidden_at").eq("user_id", me.id),
        db.from("user_tanks").select("*").eq("user_id", me.id).order("created_at"), db.from("tank_species").select("species_key,tank_id").eq("user_id", me.id)]);
      shop.items = {}; (it.data || []).forEach(x => { shop.items[x.key] = x; });
      shop.owned = new Set((ow.data || []).map(x => x.item_key));
      shop.setups = tankSetupsFrom(su.data, ut.data, ts.data);
    } catch (e) { /* older database: no shop yet */ }
    shop.ready = true; shop.loading = false;
  }
  function chestSvg() {
    const NS = "http://www.w3.org/2000/svg", mk = (t, a) => { const n = document.createElementNS(NS, t); Object.keys(a).forEach(k => n.setAttribute(k, a[k])); return n; };
    const svg = mk("svg", { viewBox: "0 0 48 40", width: "40", height: "34", "aria-hidden": "true" });
    svg.appendChild(mk("ellipse", { cx: "24", cy: "17", rx: "13", ry: "7", fill: "#ffd54a", class: "chest-glow" }));
    svg.appendChild(mk("rect", { x: "4", y: "18", width: "40", height: "18", rx: "3", fill: "#8a5a2b", stroke: "#4e3216", "stroke-width": "2" }));
    svg.appendChild(mk("rect", { x: "4", y: "24", width: "40", height: "4", fill: "#c9a24a" }));
    const lid = mk("g", { class: "chest-lid" });
    lid.appendChild(mk("path", { d: "M4 18 Q4 6 24 6 Q44 6 44 18 Z", fill: "#a8713a", stroke: "#4e3216", "stroke-width": "2" }));
    lid.appendChild(mk("rect", { x: "4", y: "14", width: "40", height: "4", fill: "#c9a24a" }));
    svg.appendChild(lid); svg.appendChild(mk("rect", { x: "21", y: "21", width: "6", height: "8", rx: "1", fill: "#ffd54a", stroke: "#4e3216", "stroke-width": "1.5" }));
    return svg;
  }
  // The treasure chest opens every so often and lets out a puff of bubbles (never moves under reduced motion)
  function chestLife(box) {
    if (tankReduced()) return;
    const tick = () => {
      if (!box.isConnected) return;
      box.classList.add("open"); snd("chest"); setTimeout(() => snd("bubble"), 500); setTimeout(() => snd("bubble"), 900);
      for (let i = 0; i < 6; i++) setTimeout(() => { if (!box.isConnected) return; const b = el("span", "cbubble"); b.style.left = (30 + Math.random() * 40) + "%"; b.style.setProperty("--dx", ((Math.random() - 0.5) * 24).toFixed(0) + "px"); b.style.animationDelay = (i * 0.18) + "s"; box.appendChild(b); setTimeout(() => b.remove(), 2600); }, 0);
      setTimeout(() => { box.classList.remove("open"); }, 2600);
      setTimeout(tick, 11000 + Math.random() * 7000);
    };
    setTimeout(tick, 2500 + Math.random() * 5000);
  }
  // Paint a setup ({gravel, placed:[{key,x,layer}]}) onto a tank element: the gravel colour and the pieces
  function tankApplySetup(tank, setup) {
    tank.querySelectorAll(".placed").forEach(e => e.remove());
    const sand = tank.querySelector(".tank-sand"), g = GRAVEL[(setup && setup.gravel) || "sand"] || GRAVEL.sand;
    if (sand) sand.style.background = `linear-gradient(${g[0]}, ${g[1]})`;
    if (tank.dataset.a11y) {
      const names = (tank.dataset.decor ? [tank.dataset.decor] : []).concat(((setup && setup.placed) || []).map(p => SHOP_ART[p.key] && SHOP_ART[p.key].n).filter(Boolean));
      tank.setAttribute("aria-label", tank.dataset.a11y + (names.length ? " Decorations: " + names.join(", ") + "." : ""));
    }
    ((setup && setup.placed) || []).forEach(p => {
      const a = SHOP_ART[p.key]; if (!a) return;
      const d = el("span", "decor placed " + (p.layer === "front" ? "lay-front" : "lay-back"));
      d.style.left = Math.max(0, Math.min(100, +p.x || 0)) + "%"; d.title = a.n; d.setAttribute("aria-hidden", "true");
      if (a.chest) { d.classList.add("chest"); d.appendChild(chestSvg()); chestLife(d); } else { d.textContent = a.e; d.style.fontSize = a.sz + "px"; if (a.f) d.style.filter = a.f + " drop-shadow(0 2px 2px rgba(0,0,0,.35))"; }
      tank.appendChild(d);
    });
  }
  function tankCustomize(view, tank, card) {
    const kind = view.kind, setupOf = () => tankSetupOf(shop.setups, view.id);
    const old = card.querySelector(".tank-custom:not(.tank-name-panel):not(.tank-fish-panel)"); if (old) { old.remove(); tankApplySetup(tank, setupOf()); return; }
    const saved = setupOf() || { gravel: null, placed: [] };
    const draft = { gravel: saved.gravel || "sand", placed: (saved.placed || []).map(p => ({ key: p.key, x: p.x, layer: p.layer })) };
    const panel = el("div", "tank-custom"); panel.setAttribute("role", "group"); panel.setAttribute("aria-label", `Customize your ${kind === "salt" ? "saltwater" : "freshwater"} tank`); panel.tabIndex = -1; card.appendChild(panel);
    const backToButton = () => { const cb = card.querySelector(".custom-btn"); if (cb && cb.focus) cb.focus(); };
    const mine = Object.keys(shop.items).filter(k => shop.owned.has(k)).map(k => shop.items[k]).filter(i => i.water === "both" || i.water === kind);
    const preview = () => tankApplySetup(tank, draft);
    const draw = fk => {   // fk = data-fk of the control to put the keyboard focus back on after the redraw
      panel.innerHTML = ""; panel.appendChild(el("div", "label", "🎨 Customize this tank"));
      const gl = mine.filter(i => i.category === "gravel"), pieces = mine.filter(i => i.category !== "gravel");
      panel.appendChild(el("div", "spot-meta", "Gravel"));
      const sw = el("div", "gravel-row"); sw.setAttribute("role", "radiogroup"); sw.setAttribute("aria-label", "Gravel color");
      [{ key: "sand", name: "Natural sand" }].concat(gl).forEach(i => {
        const b = el("button", "gravel-sw" + (draft.gravel === i.key ? " on" : "")); b.type = "button"; b.title = i.name; b.dataset.fk = "g:" + i.key; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(draft.gravel === i.key)); b.setAttribute("aria-label", i.name);
        const c = GRAVEL[i.key] || GRAVEL.sand; b.style.background = `linear-gradient(${c[0]}, ${c[1]})`;
        b.addEventListener("click", () => { draft.gravel = i.key; preview(); draw(b.dataset.fk); }); sw.appendChild(b);
      });
      panel.appendChild(sw);
      panel.appendChild(el("div", "spot-meta", "Pieces (up to 10 per tank)"));
      if (!pieces.length) panel.appendChild(el("div", "spot-meta", "You don't own any pieces for this tank yet — the 🛍 Shop has driftwood, plants, rocks and more."));
      pieces.forEach(i => {
        const cur = draft.placed.find(p => p.key === i.key), row = el("div", "piece-row");
        const lab = el("label", "piece-name"); const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!cur;
        cb.disabled = !cur && draft.placed.length >= 10; cb.dataset.fk = "p:" + i.key; if (cb.disabled) cb.title = "Limit reached: 10 pieces per tank. Untick one to add this.";
        cb.addEventListener("change", () => { if (cb.checked) draft.placed.push({ key: i.key, x: 50, layer: i.category === "plant" || i.category === "coral" ? "back" : "front" }); else draft.placed = draft.placed.filter(p => p.key !== i.key); preview(); draw(cb.dataset.fk); });
        lab.appendChild(cb); lab.appendChild(document.createTextNode(" ")); const em = el("span", null, (SHOP_ART[i.key] && SHOP_ART[i.key].e) || "✨"); em.setAttribute("aria-hidden", "true"); lab.appendChild(em); lab.appendChild(document.createTextNode(" " + i.name)); row.appendChild(lab);
        if (cur) {
          const rg = document.createElement("input"); rg.type = "range"; rg.min = 0; rg.max = 100; rg.value = cur.x; rg.setAttribute("aria-label", i.name + " position, left to right");
          const say = () => rg.setAttribute("aria-valuetext", rg.value + " percent from the left"); say();
          rg.addEventListener("input", () => { cur.x = +rg.value; say(); preview(); });
          const sel = document.createElement("select"); sel.setAttribute("aria-label", i.name + " layer");
          [["back", "Behind the fish"], ["front", "In front"]].forEach(([v, t]) => { const o = document.createElement("option"); o.value = v; o.textContent = t; if (cur.layer === v) o.selected = true; sel.appendChild(o); });
          sel.addEventListener("change", () => { cur.layer = sel.value; preview(); });
          row.appendChild(rg); row.appendChild(sel);
        }
        panel.appendChild(row);
      });
      const acts = el("div", "tank-actions"), save = el("button", "btn small", "Save"), cancel = el("button", "btn ghost small", "Cancel"), msg = el("div", "msg"); msg.setAttribute("role", "status"); msg.setAttribute("aria-live", "polite");
      save.type = "button"; cancel.type = "button";
      cancel.addEventListener("click", () => { tankApplySetup(tank, setupOf()); panel.remove(); backToButton(); });
      save.addEventListener("click", async () => {
        save.disabled = true; msg.className = "msg"; msg.textContent = "Saving…";
        const r = await db.rpc("save_tank_setup", { p_tank: view.id, p_gravel: draft.gravel === "sand" ? null : draft.gravel, p_placed: draft.placed });
        if (r.error) { save.disabled = false; msg.className = "msg err"; msg.textContent = r.error.message; return; }
        tankSetupSet(view.id, { gravel: draft.gravel === "sand" ? null : draft.gravel, placed: draft.placed.map(p => ({ key: p.key, x: p.x, layer: p.layer })) });
        panel.remove(); backToButton(); if (typeof toast === "function") toast("🎨 Tank saved — friends can see it on your profile");
      });
      acts.appendChild(save); acts.appendChild(cancel); panel.appendChild(acts); panel.appendChild(msg);
      if (fk) { const t = panel.querySelector('[data-fk="' + fk + '"]'); if (t && t.focus) t.focus(); }
    };
    draw(); panel.scrollIntoView({ block: "nearest", behavior: "smooth" }); panel.focus();
  }
  function shopDraw(box) {
    box.innerHTML = "";
    if (!shop.ready) { box.appendChild(el("div", "empty", "Opening the shop…")); return; }
    const items = Object.values(shop.items);
    if (!items.length) { box.appendChild(el("div", "empty", "The shop isn't open yet.")); return; }
    const wal = wallet || { coins: 0, gems: 0 };
    const head = el("div", "tank-card"); head.appendChild(el("div", "label", "🛍 Tank shop"));
    head.appendChild(el("div", "spot-meta", "Buy pieces with 🪙 coins or 💎 gems, then place them with 🎨 Customize on a tank. Trophy cups are only won in official tournaments. Purchases are final."));
    box.appendChild(head);
    SHOP_CATS.forEach(([cat, label]) => {
      const list = items.filter(i => i.category === cat); if (!list.length) return;
      const card = el("div", "tank-card"); card.appendChild(el("div", "label", label));
      const grid = el("div", "shop-grid"); grid.setAttribute("role", "list"); grid.setAttribute("aria-label", label); card.appendChild(grid);
      list.forEach(i => {
        const cell = el("div", "shop-item"), art = el("div", "shop-art"); cell.setAttribute("role", "listitem"); art.setAttribute("aria-hidden", "true");
        if (cat === "gravel") { const c = GRAVEL[i.key] || GRAVEL.sand; art.style.background = `linear-gradient(${c[0]}, ${c[1]})`; art.classList.add("swatch"); }
        else { const a = SHOP_ART[i.key]; if (a && a.chest) art.appendChild(chestSvg()); else { art.textContent = (a && a.e) || "✨"; if (a && a.f) art.style.filter = a.f; } }
        cell.appendChild(art); cell.appendChild(el("div", "shop-name", i.name));
        cell.appendChild(el("div", "spot-meta", i.water === "salt" ? "🌊 saltwater tank" : i.water === "fresh" ? "🌿 freshwater tank" : "any tank"));
        const owned = shop.owned.has(i.key);
        if (!owned && i.how !== "tournament" && (i.coins || i.gems)) { const pt = el("span", "shop-price", [i.coins ? i.coins + " 🪙" : "", i.gems ? i.gems + " 💎" : ""].filter(Boolean).join(" + ")); pt.setAttribute("aria-hidden", "true"); cell.appendChild(pt); }   // price tag on the picture tile (4B); the Buy button says it out loud
        if (owned) cell.appendChild(el("div", "shop-own", "✓ Owned"));
        else if (i.how === "tournament") cell.appendChild(el("div", "spot-meta", "🏆 Won in official tournaments"));
        else {
          const price = [i.coins ? i.coins + " 🪙" : "", i.gems ? i.gems + " 💎" : ""].filter(Boolean).join(" + ");
          const priceSay = [i.coins ? i.coins + " coins" : "", i.gems ? i.gems + " gems" : ""].filter(Boolean).join(" and ");
          const needC = Math.max(0, (i.coins || 0) - wal.coins), needG = Math.max(0, (i.gems || 0) - wal.gems);
          const b = el("button", "btn small", "Buy · " + price); b.type = "button"; b.setAttribute("aria-label", `Buy ${i.name} for ${priceSay}`);
          if (needC || needG) { b.disabled = true; b.textContent = price; b.setAttribute("aria-label", `${i.name} costs ${priceSay}. You don't have enough yet.`); cell.appendChild(b); cell.appendChild(el("div", "spot-meta", "Need " + [needC ? needC + " more 🪙" : "", needG ? needG + " more 💎" : ""].filter(Boolean).join(" and "))); }
          else {
            let armed = 0;
            b.addEventListener("click", async () => {
              if (!armed) { armed = setTimeout(() => { armed = 0; b.textContent = "Buy · " + price; b.setAttribute("aria-label", `Buy ${i.name} for ${priceSay}`); }, 4000); b.textContent = "Tap again to buy"; b.setAttribute("aria-label", `Press again to confirm buying ${i.name} for ${priceSay}. Purchases are final.`); return; }
              clearTimeout(armed); b.disabled = true; b.textContent = "Buying…"; b.setAttribute("aria-label", "Buying…");
              const r = await db.rpc("buy_item", { p_key: i.key });
              if (r.error) { if (typeof toast === "function") toast("Couldn't buy: " + r.error.message, 6000); armed = 0; b.disabled = false; b.textContent = "Buy · " + price; b.setAttribute("aria-label", `Buy ${i.name} for ${priceSay}`); return; }
              wallet = Object.assign({}, wallet || {}, r.data); shop.owned.add(i.key); walletDraw(); shopDraw(box);
              if (typeof toast === "function") toast("✓ Bought " + i.name + " — place it with 🎨 Customize on a tank", 6000);
            });
            cell.appendChild(b);
          }
        }
        grid.appendChild(cell);
      });
      box.appendChild(card);
    });
  }

  // ---- 🏷 Tank names + more tanks (setup/92): name any tank, up to 5 tanks, pick which of your best catches swim in an extra tank ----
  // More tanks will be bought with 🏴‍☠️ doubloons (real money) after the lawyer review; until then only the owner can give one, to test.
  const TANK_MAX = 5, TANK_NAME_MAX = 24;
  // database rows → { salt, fresh, extras: [user_tanks rows, oldest first], place: { species key → extra tank id } }
  function tankSetupsFrom(setupRows, extraRows, placeRows) {
    const out = { salt: null, fresh: null, extras: (extraRows || []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at)), place: {} };
    (setupRows || []).forEach(x => { out[x.tank] = x; });
    (placeRows || []).forEach(x => { out.place[x.species_key] = x.tank_id; });
    return out;
  }
  const tankSetupOf = (setups, id) => !setups ? null : (id === "salt" || id === "fresh") ? setups[id] : (setups.extras || []).find(x => x.id === id) || null;
  function tankSetupSet(id, patch) {
    if (id === "salt" || id === "fresh") shop.setups[id] = Object.assign({ tank: id, gravel: null, placed: [] }, shop.setups[id] || {}, patch);
    else { const x = (shop.setups.extras || []).find(e => e.id === id); if (x) Object.assign(x, patch); }
  }
  // Every tank to draw, each with the fish that swim in it: a species picked for an extra tank (same water) swims there; all others in the free tank.
  function tankViews(t, setups) {
    setups = setups || {};
    const plain = k => k === "salt" ? "Saltwater tank" : "Freshwater tank", n = { salt: 1, fresh: 1 };
    const views = ["salt", "fresh"].map(k => { const su = setups[k] || null; return { id: k, kind: k, base: true, name: (su && su.name) || null, hiddenAt: su && su.name_hidden_at, title: (su && su.name) || plain(k), setup: su, data: { fish: [], pond: t[k].pond } }; });
    (setups.extras || []).forEach(x => { if (x.water !== "salt" && x.water !== "fresh") return; n[x.water]++; views.push({ id: x.id, kind: x.water, base: false, name: x.name || null, hiddenAt: x.name_hidden_at, title: x.name || plain(x.water) + " " + n[x.water], setup: x, data: { fish: [], pond: [] } }); });
    const place = setups.place || {};
    ["salt", "fresh"].forEach(k => t[k].fish.forEach(f => {
      const to = place[f.key], v = to && views.find(x => x.id === to && x.kind === k);
      (v || views.find(x => x.id === k)).data.fish.push(f);
    }));
    return views;
  }
  // ✏️ Name (every tank) and 🐟 Choose fish (extra tanks), under your own tank
  function tankNameTools(card, view, opts) {
    const row = el("div", "tank-actions tank-own-tools");
    if (view.hiddenAt && !view.name) card.appendChild(el("div", "spot-meta", "The team removed this tank's name. You can pick a new one."));
    const nb = el("button", "btn ghost small tank-name-btn", view.name ? "✏️ Rename" : "✏️ Name this tank"); nb.type = "button";
    nb.setAttribute("aria-label", (view.name ? "Rename " : "Name ") + view.title);
    nb.addEventListener("click", () => tankNamePanel(card, view, nb));
    row.appendChild(nb);
    if (!view.base) {
      const fb = el("button", "btn ghost small tank-fish-btn", "🐟 Choose fish"); fb.type = "button";
      fb.setAttribute("aria-label", "Choose which fish swim in " + view.title);
      fb.addEventListener("click", () => tankFishPanel(card, view, opts.all, fb));
      row.appendChild(fb);
    }
    card.appendChild(row);
  }
  function tankNamePanel(card, view, back) {
    const old = card.querySelector(".tank-name-panel"); if (old) { old.remove(); back.focus(); return; }
    const p = el("div", "tank-custom tank-name-panel"); p.setAttribute("role", "group"); p.setAttribute("aria-label", "Name this tank");
    const lab = el("label", null, "Tank name"); const inp = document.createElement("input"); inp.maxLength = TANK_NAME_MAX; inp.value = view.name || ""; inp.placeholder = view.kind === "salt" ? "e.g. Snook Corner" : "e.g. Bass Palace";
    inp.id = "tn-" + view.id; lab.htmlFor = inp.id; p.appendChild(lab); p.appendChild(inp);
    p.appendChild(el("div", "spot-meta", `Up to ${TANK_NAME_MAX} letters. People who can see your profile see it. Leave it empty to remove the name.`));
    const msg = el("div", "msg"); msg.setAttribute("role", "status"); msg.setAttribute("aria-live", "polite");
    const acts = el("div", "tank-actions"), save = el("button", "btn small", "Save name"), cancel = el("button", "btn ghost small", "Cancel"); save.type = "button"; cancel.type = "button";
    cancel.addEventListener("click", () => { p.remove(); back.focus(); });
    const go = async () => {
      save.disabled = true; msg.className = "msg"; msg.textContent = "Saving…";
      const r = await db.rpc("set_tank_name", { p_tank: view.id, p_name: inp.value });
      if (r.error) { save.disabled = false; msg.className = "msg err"; msg.textContent = r.error.message; inp.focus(); return; }
      tankSetupSet(view.id, { name: r.data || null, name_hidden_at: null });
      if (typeof toast === "function") toast(r.data ? "🏷 Tank named “" + r.data + "”" : "🏷 Name removed");
      renderTank();
    };
    save.addEventListener("click", go); inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); go(); } else if (e.key === "Escape") { e.preventDefault(); p.remove(); back.focus(); } });
    acts.appendChild(save); acts.appendChild(cancel); p.appendChild(acts); p.appendChild(msg);
    card.appendChild(p); inp.focus();
  }
  // tick the species that swim in this extra tank (only this tank's water); a species can live in one tank at a time
  function tankFishPanel(card, view, all, back) {
    const old = card.querySelector(".tank-fish-panel"); if (old) { old.remove(); back.focus(); return; }
    const p = el("div", "tank-custom tank-fish-panel"); p.setAttribute("role", "group"); p.setAttribute("aria-label", "Choose fish for " + view.title);
    p.appendChild(el("div", "label", "🐟 Fish in " + view.title));
    const list = (all && all[view.kind] && all[view.kind].fish) || [], place = shop.setups.place || {};
    if (!list.length) p.appendChild(el("div", "spot-meta", `You don't have any ${view.kind === "salt" ? "saltwater" : "freshwater"} fish yet — log a catch first.`));
    p.appendChild(el("div", "spot-meta", "Ticked fish swim here. Unticked ones swim in your first tank."));
    const names = {}; (shop.setups.extras || []).forEach(x => { const v = tankViews({ salt: { fish: [], pond: [] }, fresh: { fish: [], pond: [] } }, shop.setups).find(y => y.id === x.id); names[x.id] = v ? v.title : "another tank"; });
    const boxes = list.map(f => {
      const lab = el("label", "check-row"), cb = document.createElement("input"); cb.type = "checkbox"; cb.value = f.key; cb.checked = place[f.key] === view.id;
      lab.appendChild(cb); const sp = el("span", null, f.species + (place[f.key] && place[f.key] !== view.id && names[place[f.key]] ? ` (now in ${names[place[f.key]]})` : "")); lab.appendChild(sp);
      p.appendChild(lab); return cb;
    });
    const msg = el("div", "msg"); msg.setAttribute("role", "status"); msg.setAttribute("aria-live", "polite");
    const acts = el("div", "tank-actions"), save = el("button", "btn small", "Save"), cancel = el("button", "btn ghost small", "Cancel"); save.type = "button"; cancel.type = "button";
    cancel.addEventListener("click", () => { p.remove(); back.focus(); });
    save.addEventListener("click", async () => {
      const keys = boxes.filter(b => b.checked).map(b => b.value);
      save.disabled = true; msg.className = "msg"; msg.textContent = "Saving…";
      const r = await db.rpc("set_tank_fish", { p_tank: view.id, p_species: keys });
      if (r.error) { save.disabled = false; msg.className = "msg err"; msg.textContent = r.error.message; return; }
      Object.keys(place).forEach(k => { if (place[k] === view.id) delete place[k]; });
      keys.forEach(k => { place[k] = view.id; }); shop.setups.place = place;
      if (typeof toast === "function") toast(`🐟 ${keys.length} fish now swim in ${view.title}`);
      renderTank();
    });
    acts.appendChild(save); acts.appendChild(cancel); p.appendChild(acts); p.appendChild(msg);
    card.appendChild(p); (boxes[0] || save).focus();
  }
  // 🏴‍☠️ More tanks: locked until doubloons are on sale. The owner can give themself a test tank or take one back.
  function moreTanksDraw(box) {
    const ex = (shop.setups && shop.setups.extras) || [], have = 2 + ex.length;
    const card = el("div", "tank-card more-tanks"); card.id = "more-tanks";
    card.appendChild(el("div", "label", "🏴‍☠️ More tanks"));
    card.appendChild(el("div", "spot-meta", `You have ${have} of ${TANK_MAX} tanks.` + (have < TANK_MAX ? " Extra tanks will come with 🏴‍☠️ doubloons — pick which of your best catches swim in each one." : " That's the most.")));
    if (have < TANK_MAX) { const b = el("button", "btn small", "🏴‍☠️ Coming soon"); b.type = "button"; b.disabled = true; b.id = "more-tanks-buy"; b.setAttribute("aria-label", "Get another tank: coming soon"); card.appendChild(b); }
    if (me && me.isOwner) {
      const ow = el("div", "tank-actions"); ow.appendChild(el("span", "spot-meta", "🧪 Owner test:"));
      if (have < TANK_MAX) [["salt", "🌊 Give me a saltwater tank"], ["fresh", "🌿 Give me a freshwater tank"]].forEach(([w, txt]) => {
        const b = el("button", "btn ghost small", txt); b.type = "button"; b.dataset.give = w;
        b.addEventListener("click", async () => { b.disabled = true; const r = await db.rpc("give_tank", { p_user: me.id, p_water: w }); if (r.error) { b.disabled = false; toast("Couldn't: " + r.error.message, 5000); return; } shop.ready = false; await shopLoad(); renderTank(); });
        ow.appendChild(b);
      });
      tankViews({ salt: { fish: [], pond: [] }, fresh: { fish: [], pond: [] } }, shop.setups).filter(v => !v.base).forEach(v => {
        const b = el("button", "btn ghost small", "Take back " + v.title); b.type = "button"; b.dataset.take = v.id;
        b.addEventListener("click", async () => { if (!(await askOk(`Take back ${v.title}? Its fish go back to your first tank.`))) return; const r = await db.rpc("take_tank", { p_tank: v.id }); if (r.error) { toast("Couldn't: " + r.error.message, 5000); return; } shop.ready = false; await shopLoad(); renderTank(); });
        ow.appendChild(b);
      });
      card.appendChild(ow);
    }
    box.appendChild(card);
  }
  // On someone's profile: the owner can give them a test tank
  function tankOwnerGive(box, uid, extras) {
    if (2 + extras >= TANK_MAX) return;
    const row = el("div", "tank-actions"); row.id = "prof-give-tank"; row.appendChild(el("span", "spot-meta", `🧪 Owner test (${2 + extras} of ${TANK_MAX} tanks):`));
    [["salt", "🌊 Give a saltwater tank"], ["fresh", "🌿 Give a freshwater tank"]].forEach(([w, txt]) => {
      const b = el("button", "btn ghost small", txt); b.type = "button"; b.dataset.give = w;
      b.addEventListener("click", async () => { b.disabled = true; const r = await db.rpc("give_tank", { p_user: uid, p_water: w }); b.disabled = false; toast(r.error ? "Couldn't: " + r.error.message : "✓ Tank given — they can name it and choose its fish", 5000); });
      row.appendChild(b);
    });
    box.appendChild(row);
  }
  // On someone's profile: an admin with the Reports box can remove a tank's name (with a reason; logged; the owner is told)
  function tankHideName(card, view, ownerId) {
    const b = el("button", "btn ghost small", "🙈 Remove name"); b.type = "button"; b.setAttribute("aria-label", "Remove the tank name " + view.name);
    b.addEventListener("click", () => {
      if (card.querySelector(".tank-hide-panel")) return;
      const p = el("div", "tank-custom tank-hide-panel"), lab = el("label", null, "Why? (the owner sees this)"), inp = document.createElement("input");
      inp.maxLength = 150; inp.id = "th-" + view.id; lab.htmlFor = inp.id; p.appendChild(lab); p.appendChild(inp);
      const ok = el("button", "btn small", "Remove name"); ok.type = "button";
      ok.addEventListener("click", async () => { const r = await db.rpc("hide_tank_name", { p_owner: ownerId, p_tank: view.id, p_reason: inp.value }); if (r.error) { toast("Couldn't: " + r.error.message, 5000); return; } toast("Name removed (logged)"); p.remove(); b.remove(); card.querySelectorAll(".tank-plaque").forEach(x => { x.textContent = x.textContent.replace(view.name, view.kind === "salt" ? "Saltwater tank" : "Freshwater tank"); }); });
      p.appendChild(ok); card.appendChild(p); inp.focus();
    });
    const row = el("div", "tank-actions"); row.appendChild(b); card.appendChild(row);
  }

  // ---- 🏆 Collections: how many of each Seasons group (inshore, beach & pier, offshore, freshwater) you have caught ----
  // Uses the same species list as the Seasons tab, so a new fish there becomes a new goal here. The mullet run is bait, not a catch.
  function tankCollection(catches) {
    const seen = new Set();
    (catches || []).forEach(c => { if (c.deleted_at) return; const f = seasonFor(c.species); if (f) seen.add(f.name); });
    return SEASON_GROUPS.map(([key, label]) => {
      const all = SEASONS.filter(f => f.group === key && !f.far && !/mullet run/i.test(f.name)).map(f => f.name);   // only fish that live here
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
      const bar = el("span", "col-bar"), fill = el("i"); bar.setAttribute("aria-hidden", "true"); fill.style.width = pct + "%"; bar.appendChild(fill); btn.appendChild(bar);
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
    const fw = el("div", "best-fish"); fw.appendChild(fishSvg(r.species, 150, true)); box.appendChild(fw);
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
  function tankProfile(catches, spotList, box, own, setups) {
    const t = tankBuild(catches, spotList), n = t.salt.fish.length + t.fresh.fish.length;
    const head = el("div", "label", "🐠 Tank"); head.style.marginTop = "12px"; head.id = "prof-tank"; box.appendChild(head);
    if (!n) { box.appendChild(el("div", "spot-meta", own ? "No fish yet — public and friends-only catches show here." : "No fish in the tank yet.")); return; }
    tankViews(t, setups).forEach(v => { if (v.data.fish.length) tankDraw(v.kind, v.data, box, { noSpot: true, other: !own, setup: v.setup, view: v, ownerId: setups && setups.ownerId }); });
    if (!own && me && me.isOwner && setups && setups.ownerId) tankOwnerGive(box, setups.ownerId, (setups.extras || []).length);
    const sum = x => x.pond.reduce((s, p) => s + p.n, 0), bits = [];
    if (sum(t.salt)) bits.push(`🌴 ${sum(t.salt)} in the lagoon`); if (sum(t.fresh)) bits.push(`🏞 ${sum(t.fresh)} in the pond`);
    if (bits.length) box.appendChild(el("div", "spot-meta", bits.join(" · ")));
    collectionDraw(catches, box);
  }
