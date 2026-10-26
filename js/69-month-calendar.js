// ---- 📆 Month calendar of good days (v215, plans/competitor-bite-audit.md): a page opened from a Home button ----
// Each day gets a 0–10 score from the moon and tide only (no weather, which isn't known weeks ahead): new/full moon = bigger tides,
// moon overhead/underfoot (major feeding times) near sunrise or sunset, and how big the tide swing is (NOAA predictions for the month,
// skipped quietly if they can't load). Tap a day for the times. No database change; nothing is saved.
const FC = { y: 0, m: 0, sel: null, tides: null, tideKey: "", req: 0 };
const fcPad = n => String(n).padStart(2, "0");
// The calendar day y-m-d as a moment in the middle of that day (16:00 UTC is daytime on every US coast)
const fcNoon = (y, m, d) => new Date(Date.UTC(y, m, d, 16));
function fcDayScore(y, m, d, tides) {
  const noon = fcNoon(y, m, d), tz = areaTz(), start = tzDayStart(noon, tz), end = new Date(+start + 86400000);
  const why = []; let s = 3;
  const ph = SunCalc.getMoonIllumination(noon).phase, spring = Math.abs(Math.cos(2 * Math.PI * ph));
  const mo = moonAt(noon);
  if (spring > 0.8) { s += 2.5 * spring; why.push(cap(mo.phase) + " — bigger tides"); }
  else if (spring > 0.45) { s += 1.2 * spring; why.push("Moon not far from " + (ph < 0.25 || ph > 0.75 ? "new" : "full") + " — fairly big tides"); }
  else why.push(cap(mo.phase) + " — small tides");
  let sr = null, ss = null;
  try { const t = SunCalc.getTimes(noon, LAT, LNG); sr = t.sunrise; ss = t.sunset; } catch (e) { /* no sun data */ }
  const near = (t, x) => x && Math.abs(t - x) < 90 * 60000;
  const per = solunarPeriods(noon);
  const major = per.filter(p => p.type === "major"), minor = per.filter(p => p.type === "minor");
  const dd = p => near(p.center, sr) || near(p.center, ss);
  const mj = major.filter(dd).length, mn = minor.filter(dd).length;
  if (mj) { s += Math.min(2, mj) * 1.5; why.push(mj > 1 ? "Moon feeding time at both sunrise and sunset" : "Moon feeding time at " + (near(major.find(dd).center, sr) ? "sunrise" : "sunset")); }
  if (mn) { s += 0.75; why.push("Minor feeding time near " + (minor.some(p => near(p.center, sr)) ? "sunrise" : "sunset")); }
  let day = [];
  if (tides) {
    day = tides.filter(t => t.when >= start && t.when < end);
    if (day.length > 1) {
      const fts = day.map(t => t.ft), swing = Math.max(...fts) - Math.min(...fts);
      if (tides.swingMax > 0) { const k = Math.min(1, swing / tides.swingMax); s += 2 * k; why.push(k > 0.75 ? "Big tide swing (" + swing.toFixed(1) + " ft)" : k < 0.4 ? "Small tide swing (" + swing.toFixed(1) + " ft)" : "Medium tide swing (" + swing.toFixed(1) + " ft)"); }
    }
  }
  const score = Math.max(0, Math.min(10, Math.round(s)));
  return { score, word: score >= 8 ? "Great" : score >= 6 ? "Good" : score >= 4 ? "Fair" : "Slow", why, moon: mo, major, minor, sr, ss, tides: day, tz };
}
async function fcLoadTides(y, m) {
  const key = y + "-" + m + "-" + STATION;
  if (FC.tideKey === key) return;
  const id = ++FC.req; FC.tides = null;
  try {
    const a = new Date(Date.UTC(y, m, 1)), b = new Date(Date.UTC(y, m + 1, 2));
    const url = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&application=fishing_map" +
      `&begin_date=${ymdUtc(a)}&end_date=${ymdUtc(b)}&datum=MLLW&station=${STATION}&time_zone=gmt&units=english&interval=hilo&format=json`;
    const data = await (await fetch(url)).json();
    if (id !== FC.req || !data.predictions || !data.predictions.length) return;
    const list = data.predictions.map(p => ({ when: parseNoaa(p.t), high: p.type === "H", ft: parseFloat(p.v) }));
    const byDay = {}; list.forEach(t => { const k = tzDayKey(t.when, areaTz()); (byDay[k] = byDay[k] || []).push(t.ft); });
    list.swingMax = Math.max(0, ...Object.values(byDay).map(v => v.length > 1 ? Math.max(...v) - Math.min(...v) : 0));
    FC.tides = list; FC.tideKey = key;
  } catch (e) { /* no tide numbers: the calendar uses the moon only */ }
}
async function renderFishCal() {
  const body = $("fcal-body"); if (!body) return;
  const now = new Date(), t0 = tzParts(now, areaTz());
  if (!FC.y) { FC.y = t0.y; FC.m = t0.m - 1; }
  const y = FC.y, m = FC.m, mine = ++FC.req;
  await fcLoadTides(y, m); FC.req = mine;   // a newer tap/month change simply re-renders; a tide failure is fine
  body.innerHTML = "";
  const head = el("div", "fc-head");
  const prev = el("button", "fc-nav", "‹"), next = el("button", "fc-nav", "›");
  prev.type = next.type = "button"; prev.setAttribute("aria-label", "Last month"); next.setAttribute("aria-label", "Next month");
  const step = n => { const d = new Date(Date.UTC(y, m + n, 1)); FC.y = d.getUTCFullYear(); FC.m = d.getUTCMonth(); FC.sel = null; renderFishCal(); };
  prev.addEventListener("click", () => step(-1)); next.addEventListener("click", () => step(1));
  head.append(prev, el("div", "fc-title", new Date(Date.UTC(y, m, 1, 12)).toLocaleDateString([], { month: "long", year: "numeric", timeZone: "UTC" })), next);
  body.appendChild(head);
  const grid = el("div", "fc-grid");
  ["S", "M", "T", "W", "T", "F", "S"].forEach(x => grid.appendChild(el("div", "fc-dow", x)));
  const first = new Date(Date.UTC(y, m, 1)).getUTCDay(), days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  for (let i = 0; i < first; i++) grid.appendChild(el("div", "fc-pad"));
  const today = tzDayKey(now, areaTz()), tides = FC.tides && FC.tideKey === y + "-" + m + "-" + STATION ? FC.tides : null;
  let sel = null;
  for (let d = 1; d <= days; d++) {
    const r = fcDayScore(y, m, d, tides), key = y + "-" + fcPad(m + 1) + "-" + fcPad(d);
    const b = el("button", "fc-day lvl-" + r.word.toLowerCase()); b.type = "button"; b.dataset.day = key;
    if (key === today) b.classList.add("today");
    if (key < today) b.classList.add("past");
    b.innerHTML = `<span class="fc-n">${d}</span><span class="fc-m">${r.moon.emoji}</span><span class="fc-s">${r.score}</span>`;
    b.setAttribute("aria-label", `${d}: ${r.score} out of 10, ${r.word}`);
    b.addEventListener("click", () => { FC.sel = d; renderFishCal(); });
    grid.appendChild(b);
    if (FC.sel === d || (FC.sel == null && key === today)) sel = { d, r };
  }
  body.appendChild(grid);
  const lg = el("div", "fc-legend");
  [["great", "8–10 Great"], ["good", "6–7 Good"], ["fair", "4–5 Fair"], ["slow", "0–3 Slow"]].forEach(([c, t]) => lg.appendChild(el("span", "fc-lg lvl-" + c, t)));
  body.appendChild(lg);
  if (sel) {
    const r = sel.r, tz = r.tz, box = el("div", "fc-detail");
    box.appendChild(el("h3", null, new Date(Date.UTC(y, m, sel.d, 12)).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }) + " — " + r.score + "/10 · " + r.word));
    r.why.forEach(t => box.appendChild(el("div", "ts-row", "• " + t)));
    const line = (lab, txt) => box.appendChild(el("div", "spot-meta", lab + " " + txt));
    if (r.sr && r.ss) line("🌅", "Sunrise " + clock(r.sr, tz) + " · Sunset " + clock(r.ss, tz));
    if (r.major.length) line("🌙", "Best moon times: " + r.major.map(p => clock(p.center, tz)).join(", "));
    if (r.tides.length) line("🌊", "Tides: " + r.tides.map(t => (t.high ? "high " : "low ") + clock(t.when, tz)).join(" · "));
    else if (!tides) line("🌊", "Tide times could not load — this day uses the moon only.");
    box.appendChild(el("div", "spot-meta", "Moon and tide only — it can't know the wind or weather that far ahead. For right now, use the Fishing right now number on Home."));
    body.appendChild(box);
  }
}
function openFishCal() { FC.y = 0; FC.sel = null; showView("fcal"); window.scrollTo({ top: 0 }); }

(function fishCalSetup() {
  const back = $("fcal-back"); if (back) back.addEventListener("click", () => showView("list"));
  const grid = document.querySelector("#hn-act-sec .hn-acts");
  if (grid) {
    const b = el("button", "hn-act"); b.type = "button"; b.id = "fcal-open";
    b.innerHTML = '<span class="hn-act-i">' + (typeof ic === "function" ? ic("calendar") : "📆") + '</span><span class="hn-act-t"><b>Good days</b><small>Month calendar</small></span>';
    b.addEventListener("click", openFishCal); grid.appendChild(b);
  }
})();
