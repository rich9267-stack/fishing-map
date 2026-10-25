// ---- Home screen, "Clean Social" look (redesign step 3; docs/fishing-map-redesign/DESIGN-HANDOFF.md) ----
// Layout only. Every old element and id is still there and does the real work (Start trip, Heading out, Plan a trip, Learn, the weather
// and red-tide alerts, the tide/wind/water/moon text); the new pieces below copy what those show or press their buttons.
// Pieces: "On the water now" circles · one alerts line · conditions with a tide line · "You're at" prompt · Plan/Learn buttons.
(function homeScreen() {
  const view = $("view-list"); if (!view) return;
  const ic = n => (typeof iconSvg === "function" ? iconSvg(n) : "");
  const hn = el("div"); hn.id = "hn";
  view.insertBefore(hn, view.firstChild);

  // ---- On the water now: Heading out + the friends whose check-ins I'm watching (the same people ci-watch lists) ----
  const water = el("div", "hn-sec"); water.id = "hn-water-sec";
  const strip = el("div", "hn-stories"); strip.id = "hn-water";
  water.appendChild(strip); hn.appendChild(water);
  function story(label, inner, onClick, cls) {
    const b = el("button", "hn-story" + (cls ? " " + cls : "")); b.type = "button";
    const ring = el("span", "hn-ring"); if (typeof inner === "string") ring.innerHTML = inner; else ring.appendChild(inner);
    b.appendChild(ring); b.appendChild(el("span", "hn-story-l", label)); b.addEventListener("click", onClick); return b;
  }
  const goTo = id => { const e = $(id); if (e && !e.hidden) e.scrollIntoView({ behavior: "smooth", block: "center" }); };
  function renderWater() {
    strip.innerHTML = "";
    const mine = typeof ci !== "undefined" && ci.mine;
    strip.appendChild(mine
      ? story("Check-in on", ic("lifebuoy"), () => goTo("ci-mine"), "hn-add on")
      : story("Heading out", ic("plus"), () => $("ci-start").click(), "hn-add"));
    const w = (typeof ci !== "undefined" && ci.watch) || [];
    w.forEach(x => {
      const name = typeof ciWho === "function" ? ciWho(x.user_id) : "Friend";
      const av = typeof avatarNode === "function" ? avatarNode(null, name, 56, null) : el("span", null, name[0]);
      strip.appendChild(story(name.split(" ")[0], av, () => goTo("ci-watch"), "hn-friend" + (x.status === "alerted" ? " late" : "")));
    });
    const t = el("div", "hn-water-t");
    t.appendChild(el("b", null, "On the water now"));
    t.appendChild(el("span", null, w.length ? `${w.length} friend${w.length === 1 ? "" : "s"} fishing` : "No friends out right now"));
    strip.appendChild(t);
  }
  renderWater();
  { const cw = $("ci-watch"), cm = $("ci-mine"); [cw, cm].forEach(e => e && new MutationObserver(renderWater).observe(e, { childList: true })); }

  // ---- Alerts: ONE line that opens the full list (the weather + red tide banners are moved under it) ----
  const alerts = el("div", "hn-sec hn-alerts-sec"); alerts.id = "hn-alerts-sec"; alerts.hidden = true;
  const arow = el("button", "hn-alerts"); arow.type = "button"; arow.id = "hn-alerts"; arow.setAttribute("aria-expanded", "false");
  const alist = el("div", "hn-alerts-list"); alist.id = "hn-alerts-list"; alist.hidden = true;
  alerts.appendChild(arow); alerts.appendChild(alist); hn.appendChild(alerts);
  ["rt-banner", "wx-banner"].forEach(id => { const b = $(id); if (b) alist.appendChild(b); });
  const alertName = t => t.replace(/^[^A-Za-z]+/, "").replace(/\s+(red tide reported nearby|Warning|Watch|Advisory|Statement)$/i, " $1").trim();
  function renderAlerts() {
    const items = [...alist.querySelectorAll(".wx-item")];
    alerts.hidden = !items.length;
    if (!items.length) { alist.hidden = true; return; }
    const names = []; items.forEach(i => { const b = i.querySelector("b"); const n = b ? alertName(b.textContent).toLowerCase() : ""; if (n && !names.includes(n)) names.push(n); });
    const shown = names.slice(0, 2).join(", ") + (names.length > 2 ? "…" : "");
    arow.innerHTML = "";
    const ico = el("span", "hn-alerts-i"); ico.innerHTML = ic("alert"); arow.appendChild(ico);
    const tx = el("span", "hn-alerts-t"); const b = el("b", null, `${items.length} ${items.length === 1 ? "alert" : "alerts"}`); tx.appendChild(b); tx.appendChild(document.createTextNode(" · " + shown)); arow.appendChild(tx);
    arow.appendChild(el("span", "hn-alerts-v", alist.hidden ? "View" : "Hide"));
  }
  arow.addEventListener("click", () => { alist.hidden = !alist.hidden; arow.setAttribute("aria-expanded", String(!alist.hidden)); renderAlerts(); });
  ["rt-banner", "wx-banner"].forEach(id => { const b = $(id); if (b) new MutationObserver(renderAlerts).observe(b, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] }); });

  // ---- Conditions: tide words, tide line, one line of wind · water · moon ----
  const cond = el("div", "hn-sec"); cond.id = "hn-cond-sec";
  const cbtn = el("button", "hn-cond"); cbtn.type = "button"; cbtn.id = "hn-cond"; cbtn.setAttribute("aria-label", "Open weather, tides and moon");
  cbtn.innerHTML = '<div class="hn-cond-top"><div><div class="hn-lab" id="hn-tide-lab">Tide</div><div class="hn-big" id="hn-tide-big">Loading…</div></div><div class="hn-count" id="hn-tide-in"></div></div>' +
    '<svg class="hn-graph" id="hn-graph" viewBox="0 0 340 118" role="img" aria-label="Tide today"></svg>' +
    '<div class="hn-line" id="hn-line"></div>';
  cond.appendChild(cbtn); hn.appendChild(cond);
  cbtn.addEventListener("click", () => { const t = document.querySelector('#today-strip .tile'); if (t) t.click(); });

  const hm = ms => { const m = Math.max(0, Math.round(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; };
  function tideAt(tides, t) {
    let a = null, b = null;
    for (let i = 0; i < tides.length - 1; i++) if (tides[i].when <= t && tides[i + 1].when > t) { a = tides[i]; b = tides[i + 1]; break; }
    if (!a) return null;
    const f = (t - a.when) / (b.when - a.when);
    return a.ft + (b.ft - a.ft) * (1 - Math.cos(Math.PI * f)) / 2;
  }
  function renderTide() {
    const tides = window.homeTides, lab = $("hn-tide-lab"), big = $("hn-tide-big"), cnt = $("hn-tide-in"), g = $("hn-graph");
    if (!tides || !tides.length) return;
    const now = new Date(), tz = typeof areaTz === "function" ? areaTz() : undefined, next = tides.find(t => t.when > now);
    if (next) {
      lab.textContent = "Tide · " + (next.high ? "coming in" : "going out");
      big.textContent = `${next.high ? "High" : "Low"} at ${clock(next.when, tz)}`;
      cnt.textContent = "in " + hm(next.when - now);
    }
    const day0 = typeof tzDayStart === "function" ? tzDayStart(now, tz) : new Date(new Date().setHours(0, 0, 0, 0));
    const t0 = day0.getTime() + 6 * 3600000, t1 = day0.getTime() + 22 * 3600000, N = 64, pts = [];
    for (let i = 0; i <= N; i++) { const t = t0 + (t1 - t0) * i / N, h = tideAt(tides, t); if (h != null) pts.push([t, h]); }
    if (pts.length < 8) { g.innerHTML = ""; return; }
    const W = 340, L = 8, R = 8, T = 10, B = 96, lo = Math.min(...pts.map(p => p[1])), hi = Math.max(...pts.map(p => p[1])), span = Math.max(0.5, hi - lo);
    const X = t => L + (W - L - R) * (t - t0) / (t1 - t0), Y = h => B - (B - T - 8) * (h - lo) / span - 4;
    let d = ""; pts.forEach((p, i) => { d += (i ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1); });
    let s = `<path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>`;
    const nowT = now.getTime();
    if (nowT >= t0 && nowT <= t1) {
      const hh = tideAt(tides, nowT), x = X(nowT);
      s += `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${T}" y2="${B}" stroke="var(--text-2)" stroke-width="1" stroke-dasharray="3 3"/>`;
      if (hh != null) s += `<circle cx="${x.toFixed(1)}" cy="${Y(hh).toFixed(1)}" r="4.5" fill="var(--card)" stroke="var(--accent)" stroke-width="2"/>`;
    }
    [["6a", 6], ["10a", 10], ["2p", 14], ["6p", 18], ["10p", 22]].forEach(([l, h]) => { s += `<text x="${X(day0.getTime() + h * 3600000).toFixed(1)}" y="113" text-anchor="middle" font-size="10.5" fill="var(--text-2)">${l}</text>`; });
    g.innerHTML = s;
  }
  window.homeCondRender = renderTide;

  function renderLine() {
    const v = id => { const e = $(id); return e ? (e.textContent || "").trim() : ""; };
    const wind = v("ts-wind").replace(/\s*mph.*$/i, "").replace(/^[^A-Za-z0-9]+/, ""), water = v("ts-water").replace(/\s*°?\s*F.*$/i, ""), moon = v("ts-moon").replace(/\s*moon.*$/i, "");
    const parts = [];
    if (wind && wind !== "…" && !/unavailable/i.test(wind)) parts.push(`<b>${wind.replace(/</g, "&lt;")}</b> wind`);
    if (/\d/.test(water)) parts.push(`<b>${water.replace(/</g, "&lt;")}°</b> water`);
    if (moon && moon !== "…") parts.push(`<b>${moon.replace(/</g, "&lt;")}</b> moon`);
    $("hn-line").innerHTML = parts.join(" · ");
  }
  ["ts-wind", "ts-water", "ts-moon", "ts-tide", "ts-tide2"].forEach(id => { const e = $(id); if (e) new MutationObserver(() => { renderLine(); renderTide(); }).observe(e, { childList: true, characterData: true, subtree: true }); });
  setInterval(renderTide, 60000);

  // ---- "You're at …" prompt: ONE Start trip button (it presses the old prompt's button, or ▶ Start trip when there is no prompt) ----
  const loc = el("div", "hn-sec hn-loc-sec"); loc.id = "hn-loc-sec";
  loc.innerHTML = '<div class="hn-loc"><span class="hn-loc-i">' + ic("pin") + '</span><div class="hn-loc-t"><div class="hn-lab" id="hn-loc-l"></div><div class="hn-loc-n" id="hn-loc-n"></div></div>' +
    '<button type="button" class="hn-loc-x" id="hn-loc-x" aria-label="Not now" hidden>' + ic("xcircle") + '</button><button type="button" class="btn hn-start" id="hn-start">Start trip</button></div>';
  hn.appendChild(loc);
  function renderLoc() {
    const ask = $("session-ask"), asking = ask && !ask.hidden, sb = $("session-bar"), running = sb && !sb.hidden;
    loc.hidden = !!running;
    $("hn-loc-x").hidden = !asking;
    if (asking) {
      const m = ($("session-ask-text").textContent || "").match(/You're at (.+?)\s+[—-]/);
      $("hn-loc-l").textContent = "You're at"; $("hn-loc-n").textContent = m ? m[1] : ($("session-ask-text").textContent || "").replace(/^[^A-Za-z]+/, "");
    } else { $("hn-loc-l").textContent = "Ready to fish?"; $("hn-loc-n").textContent = "Pick a spot to start"; }
  }
  $("hn-start").addEventListener("click", () => { const ask = $("session-ask"); if (ask && !ask.hidden) $("session-ask-yes").click(); else $("hq-start").click(); });
  $("hn-loc-x").addEventListener("click", () => $("session-ask-no").click());
  ["session-ask", "session-bar", "hq-start"].forEach(id => { const e = $(id); if (e) new MutationObserver(renderLoc).observe(e, { attributes: true, attributeFilter: ["hidden"], childList: true, subtree: true, characterData: true }); });
  renderLoc();

  // ---- Plan a trip · Learn ----
  const act = el("div", "hn-sec hn-act-sec"); act.id = "hn-act-sec";
  const mk = (icon, t, s, fn) => { const b = el("button", "hn-act"); b.type = "button"; b.innerHTML = '<span class="hn-act-i">' + ic(icon) + '</span><span class="hn-act-t"><b>' + t + '</b><small>' + s + '</small></span>'; b.addEventListener("click", fn); return b; };
  const grid = el("div", "hn-acts");
  grid.appendChild(mk("calendar", "Plan a trip", "Invite friends", () => $("plan-add").click()));
  grid.appendChild(mk("book", "Learn", "Rules, fish, rigs, knots", () => $("learn-card").click()));
  act.appendChild(grid); hn.appendChild(act);

  // ---- the ranked list: "How it's ranked" shows the explanation + the extra detail lines ----
  const how = $("best-how"), card = $("best-card");
  if (how && card) how.addEventListener("click", () => { const o = card.classList.toggle("how-open"); how.setAttribute("aria-expanded", String(o)); });

  // ---- header: tap the area line to change home waters; ? and search are icons ----
  const sub = $("hdr-sub");
  if (sub) { sub.setAttribute("role", "button"); sub.tabIndex = 0; sub.addEventListener("click", () => $("profile-btn").click()); sub.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("profile-btn").click(); } }); }
})();
