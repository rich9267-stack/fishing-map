// ---- 🌦 Weather screen (weather plan step 3; Project doc claude/weather-plan.md): opened from the Home weather card ----
// Loaded only when opened (js/48 LAZY_CODE "wx"). Shows the place chips (your area + your spots + any spot), Now, Fishing right now,
// and Go or stay home (Shore / Boat). Later steps add hour by hour, wind & pressure, tides, water, sun & moon, 10 days, radar.
// The chosen place is remembered on this phone (fm-wx-place). Data: wxdGet / wxdVerdict (js/74).
const WXS_KEY = "fm-wx-place";
function wxsPlace() {
  let p = null; try { p = JSON.parse(localStorage.getItem(WXS_KEY) || "null"); } catch (e) {}
  if (p && p.spot) {
    const s = (typeof spots !== "undefined" && spots || []).concat(typeof spotsAll !== "undefined" ? spotsAll : []).find(x => x.id === p.spot);
    if (s && hasLoc(s)) return { spot: s, lat: s.lat, lng: s.lng, name: s.name, tz: tzFor(s.lat, s.lng), lake: s.water_type === "freshwater" };
  }
  return { spot: null, lat: LAT, lng: LNG, name: (typeof area !== "undefined" && area.name) || "Your area", tz: typeof areaTz === "function" ? areaTz() : undefined, lake: false };
}
function wxsSetPlace(spotId) {
  try { if (spotId) localStorage.setItem(WXS_KEY, JSON.stringify({ spot: spotId })); else localStorage.removeItem(WXS_KEY); } catch (e) {}
  renderWxScreen();
}
// Your own spots with a pin, most-fished first (the chips); every spot you can see (the "Other spot" list)
function wxsSpotLists() {
  const circle = (typeof spots !== "undefined" && spots || []).filter(s => hasLoc(s)), seen = new Set(circle.map(s => s.id));
  // plus public spots within 60 miles of the area now (the 🌎 Public list can cover the whole country)
  const pub = (typeof spotsAll !== "undefined" ? spotsAll : []).filter(s => hasLoc(s) && !seen.has(s.id) && miles(LAT, LNG, s.lat, s.lng) <= 60);
  const all = circle.concat(pub);
  const meId = typeof me !== "undefined" && me ? me.id : null;
  const n = s => (typeof catchesBySpot !== "undefined" && catchesBySpot[s.id] || []).length;
  const mine = all.filter(s => s.created_by === meId).sort((a, b) => n(b) - n(a) || String(a.name).localeCompare(String(b.name)));
  return { chips: mine.slice(0, 3), all: all.slice().sort((a, b) => String(a.name).localeCompare(String(b.name))) };
}

let wxsBusy = 0;
function renderWxScreen(force) {
  const body = $("wx-body"); if (!body) return;
  const p = wxsPlace(), lists = wxsSpotLists(), myTurn = ++wxsBusy;
  body.innerHTML = "";
  // place chips
  const pick = el("div", "wx-sec wx-places");
  pick.appendChild(el("div", "hn-lab", "Show weather for"));
  const row = el("div", "wx-chips");
  const chip = (label, on, fn) => { const b = el("button", "wx-chip" + (on ? " on" : ""), label); b.type = "button"; b.setAttribute("aria-pressed", String(on)); b.addEventListener("click", fn); row.appendChild(b); };
  chip(`📍 ${(typeof area !== "undefined" && area.name) || "Your area"}`, !p.spot, () => wxsSetPlace(null));
  lists.chips.forEach(s => chip(s.name, !!p.spot && p.spot.id === s.id, () => wxsSetPlace(s.id)));
  if (p.spot && !lists.chips.some(s => s.id === p.spot.id)) chip(p.spot.name, true, () => {});
  pick.appendChild(row);
  if (lists.all.length) {
    const lab = el("label", "wx-other"); lab.appendChild(el("span", null, "Other spot"));
    const sel = el("select"); sel.id = "wx-spot-pick";
    sel.appendChild(new Option("Pick a spot…", ""));
    lists.all.forEach(s => sel.appendChild(new Option(s.name, s.id)));
    sel.addEventListener("change", () => { if (sel.value) wxsSetPlace(sel.value); });
    lab.appendChild(sel); pick.appendChild(lab);
  }
  body.appendChild(pick);
  const load = el("div", "wx-sec", "Loading the weather…"); load.id = "wx-loading";
  body.appendChild(load);

  wxdGet(p.lat, p.lng, { force: !!force }).then(w => {
    if (myTurn !== wxsBusy || $("view-wx").hidden) return;
    load.remove();
    const n = w.now, tz = p.tz, h = wxdNowHour(w), d0 = w.days.find(d => d.t + 86400000 > Date.now()) || w.days[0] || {};
    // updated line + refresh
    const upd = el("div", "wx-upd");
    upd.appendChild(el("span", null, (w.stale ? "Saved forecast from " : "Updated ") + clock(new Date(w.at), tz) + (w.stale ? " (no signal)" : "")));
    const rb = el("button", "btn ghost small", "↻ Refresh"); rb.type = "button"; rb.id = "wx-refresh"; rb.addEventListener("click", () => renderWxScreen(true));
    upd.appendChild(rb); body.appendChild(upd);
    // alerts the app already checks (NWS)
    const names = wxdAlertNames();
    if (names.length) {
      const a = el("div", "wx-sec wx-alerts");
      names.slice(0, 4).forEach(x => a.appendChild(el("div", "wx-alert", "⚠ " + x)));
      a.appendChild(el("div", "spot-meta", "From the National Weather Service. Tap the alerts line on Home to read them."));
      body.appendChild(a);
    }
    // Now
    const now = el("div", "wx-sec wx-now"); now.id = "wx-now-card";
    now.innerHTML = `<div class="wx-now-top">${wxdIcon(n.code, n.isDay, 64)}<div><div class="wx-big" id="wx-temp">${n.tempF != null ? n.tempF + "°" : "–"}</div>` +
      `<div class="wx-sub">${wxdEsc(n.sky)}${n.feelsF != null ? ` · feels like ${n.feelsF}°` : ""}</div>` +
      `<div class="wx-sub">${d0.hiF != null ? `High ${d0.hiF}° · Low ${d0.loF}° · ` : ""}rain ${n.rainPct != null ? n.rainPct : "–"}%</div>` +
      `<div class="wx-sub">Wind ${wxdEsc(n.dir)} ${n.mph != null ? n.mph : "–"} mph${n.gust != null ? `, gusts ${n.gust}` : ""}</div></div></div>`;
    // Fishing right now (js/67): your area = Home's number; a spot = that spot's own number
    let r = null;
    try { r = p.spot ? spotScoreAt(p.spot, new Date(), spotFcHour(p.spot, new Date())) : todayScore(); } catch (e) { r = null; }
    if (r) {
      const sb = el("button", "wx-score"); sb.type = "button"; sb.dataset.lvl = r.word.toLowerCase();
      const st = el("span"); st.append(el("b", null, `Fishing right now: ${r.word}`), el("small", null, r.why.filter(x => x.n > 0).slice(0, 2).map(x => x.text).join(" · ")));
      sb.append(el("span", "wx-score-n", String(r.score)), st, el("span", "ts-more", "Why?"));
      const why = el("div", "ts-why"); why.hidden = true;
      r.why.forEach(x => why.appendChild(el("div", "ts-row " + (x.n > 0 ? "up" : x.n < 0 ? "down" : ""), (x.n > 0 ? "▲ " : x.n < 0 ? "▼ " : "• ") + x.text)));
      sb.addEventListener("click", () => { why.hidden = !why.hidden; });
      now.append(sb, why);
    }
    body.appendChild(now);
    // Go or stay home
    const go = el("div", "wx-sec wx-gobox"); go.id = "wx-gobox";
    const v = wxdVerdict(h, { ahead: w.hours, alerts: names, lake: p.lake || !w.marine });
    go.appendChild(el("div", "hn-lab", "GO OR STAY HOME?"));
    [["Shore", v.shore], ["Boat", v.boat]].forEach(([name, x]) => {
      const rowv = el("div", "wx-go-row lvl-" + x.level);
      const rt = el("span"); rt.append(el("b", null, `${name}: ${x.word}`), el("small", null, x.why.join(" · ")));
      rowv.append(el("span", "wx-dot"), rt);
      go.appendChild(rowv);
    });
    go.appendChild(el("div", "spot-meta", "Stay home = a storm or marine warning, thunder close by, or wind over 25 mph" + (v.lake ? "" : " or seas over 6 ft") + ". A help, not a promise — always check the official forecast before you go."));
    body.appendChild(go);
    // Hour by hour, 48 hours (step 5, js/76)
    if (typeof wxhSection === "function") body.appendChild(wxhSection(w, p));
    // Wind dial + pressure card, side by side (step 6, js/77)
    if (typeof wxpSection === "function") body.appendChild(wxpSection(w, p));
    // Tides + Water & waves (step 7, js/78)
    if (typeof wxwSections === "function") wxwSections(w, p).forEach(x => body.appendChild(x));
    // until the moon section moves here (step 8): the old moon & feeding times (and the long tide tables)
    const old = el("button", "btn ghost wx-oldbtn", "Moon, feeding times & tide tables"); old.type = "button"; old.id = "wx-old";
    old.addEventListener("click", () => { showView("list"); const d = $("cond-more"); if (d) { d.open = true; d.classList.add("as-sheet"); document.body.classList.add("cond-open"); } });
    if (!p.spot) body.appendChild(old);
    body.appendChild(el("div", "wx-credit", "Weather data by Open-Meteo.com (CC BY 4.0) · National Weather Service · NOAA Tides & Currents."));
  }, () => {
    if (myTurn !== wxsBusy) return;
    load.textContent = navigator.onLine === false ? "No signal — the weather can't load right now." : "Couldn't load the weather right now. Try ↻ in a minute.";
    const rb = el("button", "btn ghost small", "↻ Try again"); rb.type = "button"; rb.addEventListener("click", () => renderWxScreen(true)); load.appendChild(rb);
  });
}
(function wxScreenSetup() {
  const back = $("wx-back"); if (back) back.addEventListener("click", () => showView("list"));
})();
