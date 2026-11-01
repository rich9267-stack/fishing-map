  // ---- 🐠 Tank screen (v260, speed plan step 2): the swimming tanks, sound-free parts of Play › Tank, Shop & Customize, tank names and the tank on profiles.
  // Loaded only when a tank is first shown (needCode("tank"), js/48); the shared tank bits (fish pictures, coins, sound, New best!) stay in js/14.
  // ---- 🏊 Swimming engine: fish wander on their own, turn around smoothly, stay in the water, and sit at different depths ----
  // One shared timer drives every scene on screen; it stops when nothing is showing. A fish is { el, turnEl, w, h, depth } — `el` moves,
  // `turnEl` flips (scaleX passes through 0, so a turn looks like the fish rolling round) and tilts with its climb or dive.
  const TANK_SIMS = new Set(); let tankRaf = 0, tankLast = 0;
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
    // No free decorations (v242): the only pieces in a tank are ones the person bought in the Shop (or won) and placed with 🎨 Customize
    // Spoken description: the tank is a labelled group; its fish are buttons; the placed pieces are read out in the label (they are only pictures)
    tank.setAttribute("role", "group"); tank.dataset.a11y = `${view.name ? view.name + ", a " + (salt ? "saltwater" : "freshwater") + " tank" : view.title} with ${fish.length} species. Tab to a fish and press Enter for its details.`;
    // The cabinet: the tank sits in a dark frame with a name plaque under the glass ("Snook Corner · 6 fish", or "Saltwater tank · 6 fish" with no name)
    const cab = el("div", "tank-cab"); cab.appendChild(tank);
    cab.appendChild(el("div", "tank-plaque", `${view.title} · ${fish.length} fish`));
    card.appendChild(cab);
    tankApplySetup(tank, opts.setup);
    tankSwim(tank, items, { seed: salt ? 1 : 2, chase: true });
    if (mineOwn) { const h = el("div", "spot-meta tank-nodecor", "No decorations yet — get pieces in the 🛍 Shop, then tap 🎨 Customize to place them."); h.hidden = !shop.ready || !!((opts.setup && opts.setup.placed) || []).length; card.appendChild(h); }
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

  // ---- 🛍 Shop & 🎨 Customize: gravel colors and pieces you buy (coins/gems) or win, placed in your tanks and saved to your account (setup/42) ----
  // Prices and what you own live in the database; this is only the pictures (colour drawings from js/72 for now — artist art can replace them entry by entry; e is kept for text).
  const GRAVEL = { sand: ["#e6d3a1", "#c9b078", "Natural sand"], gravel_black: ["#55555c", "#2c2c31"], gravel_blue: ["#6fa8dc", "#3b6ea5"], gravel_green: ["#8fbc6f", "#4f8a3b"], gravel_pink: ["#f3a6c3", "#d4709a"], gravel_white: ["#f4f1ea", "#d8d2c4"] };
  const SHOP_ART = {
    wood_small: { art: "driftwood", e: "🪵", sz: 26, n: "Small driftwood" }, wood_big: { art: "driftwood", e: "🪵", sz: 46, n: "Big driftwood" },
    plant_grass: { art: "grass", e: "🌾", sz: 36, n: "Sea grass" }, plant_kelp: { art: "kelp", e: "🌿", sz: 58, n: "Kelp" },
    plant_leafy: { art: "leafy", e: "🍃", sz: 34, n: "Leafy water plant" }, plant_fern: { art: "fern", e: "🌿", sz: 38, n: "Water fern" }, plant_lily: { art: "lily", e: "🪷", sz: 28, n: "Lily pads" },
    rock_small: { art: "rock", e: "🪨", sz: 22, n: "Small rocks" }, rock_pile: { art: "pile", e: "🪨", sz: 40, n: "Boulder pile" }, rock_arch: { art: "arch", e: "🪨", sz: 58, n: "Rock arch" },
    coral_brain: { art: "brain", e: "🪸", sz: 32, n: "Brain coral" }, coral_fan: { art: "fan", e: "🪸", sz: 42, n: "Sea fan" }, coral_branch: { art: "staghorn", e: "🪸", sz: 52, n: "Staghorn coral" },
    shell_scallop: { art: "shell", e: "🦪", sz: 22, n: "Scallop shell" }, shell_conch: { art: "conch", e: "🐚", sz: 24, n: "Conch shell" },
    diver: { art: "diver", e: "🤿", sz: 40, n: "Diver figurine" }, chest: { e: "💰", sz: 36, n: "Treasure chest", chest: true },
    trophy_gold: { art: "trophy", tint: "gold", e: "🏆", sz: 32, n: "Gold trophy cup" }, trophy_silver: { art: "trophy", tint: "silver", e: "🏆", sz: 30, n: "Silver trophy cup" }, trophy_bronze: { art: "trophy", tint: "bronze", e: "🏆", sz: 28, n: "Bronze trophy cup" }
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
    const nd = tank.closest(".tank-card") && tank.closest(".tank-card").querySelector(".tank-nodecor"); if (nd) nd.hidden = !shop.ready || !!((setup && setup.placed) || []).length;
    const sand = tank.querySelector(".tank-sand"), g = GRAVEL[(setup && setup.gravel) || "sand"] || GRAVEL.sand;
    if (sand) sand.style.background = `linear-gradient(${g[0]}, ${g[1]})`;
    if (tank.dataset.a11y) {
      const names = ((setup && setup.placed) || []).map(p => SHOP_ART[p.key] && SHOP_ART[p.key].n).filter(Boolean);
      tank.setAttribute("aria-label", tank.dataset.a11y + (names.length ? " Decorations: " + names.join(", ") + "." : ""));
    }
    ((setup && setup.placed) || []).forEach(p => {
      const a = SHOP_ART[p.key]; if (!a) return;
      const d = el("span", "decor placed " + (p.layer === "front" ? "lay-front" : "lay-back"));
      d.style.left = Math.max(0, Math.min(100, +p.x || 0)) + "%"; d.title = a.n; d.setAttribute("aria-hidden", "true");
      if (a.chest) { d.classList.add("chest"); d.appendChild(chestSvg()); chestLife(d); } else d.appendChild(tankArt(a.art, Math.round(a.sz * 1.4), a.tint));
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
        else { const a = SHOP_ART[i.key]; if (a && a.chest) art.appendChild(chestSvg()); else if (a) art.appendChild(tankArt(a.art, 34, a.tint)); else art.textContent = "✨"; }
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
