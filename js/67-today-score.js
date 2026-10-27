// ---- Today score on Home: one 0–10 number for "how good is fishing right now" (v211, plans/competitor-bite-audit.md) ----
// Works for everyone, even with no catches logged: it uses only general fishing patterns and what the app already loads
// (tide times, wind, pressure trend, moon / solunar, sunrise and sunset). The ranked spot list below still uses your own catches.
// No database change; nothing is saved.
// One scoring recipe for Home (right now, your area) and for a chosen spot + time (v227). Missing inputs (null) are simply skipped.
// in: { slack: "high"|"low"|null, flow: "in"|"out"|null, mph, trend, sol: "major"|"minor"|null, majorSoon, phase, sun: "sunrise"|"sunset"|null }
function scoreCore(i) {
  let s = 5; const why = [];
  const add = (n, text) => { s += n; why.push({ n, text }); };
  if (i.slack) add(-0.5, `Slack tide (${i.slack} turning)`);
  else if (i.flow) add(1.5, i.flow === "in" ? "Tide coming in" : "Tide going out");
  const mph = i.mph;
  if (mph != null) {
    if (mph > 20) add(-2.5, `Too windy (${mph} mph)`);
    else if (mph > 15) add(-1, `Breezy (${mph} mph)`);
    else if (mph >= 6) add(1, `Nice breeze (${mph} mph)`);
    else add(0.5, `Light wind (${mph} mph)`);
  }
  if (i.trend === "falling") add(1.5, "Pressure falling — fish often feed");
  else if (i.trend === "rising") add(-1, "Pressure rising — often slower");
  else if (i.trend === "steady") add(0.5, "Pressure steady");
  if (i.sol === "major") add(1.5, "Major feeding time now");
  else if (i.sol === "minor") add(0.75, "Minor feeding time now");
  else if (i.majorSoon) add(0.5, "Major feeding time within 3 hours");
  if (i.phase === "new moon" || i.phase === "full moon") add(0.5, cap(i.phase));
  if (i.sun === "sunrise") add(1, "Around sunrise");
  else if (i.sun === "sunset") add(1, "Around sunset");
  const score = Math.max(0, Math.min(10, Math.round(s)));
  const word = score >= 8 ? "Great" : score >= 6 ? "Good" : score >= 4 ? "Fair" : "Slow";
  return { score, word, why };
}
const sunNear = (now, lat, lng) => {
  try { const t = SunCalc.getTimes(now, lat, lng), near = x => x && Math.abs(now - x) < 90 * 60000; return near(t.sunrise) ? "sunrise" : near(t.sunset) ? "sunset" : null; } catch (e) { return null; }
};
const solInfo = now => {
  try { return { sol: solunarAt(now) || null, majorSoon: [1, 2, 3].some(h => solunarAt(new Date(+now + h * 3600000)) === "major"), phase: moonAt(now).phase }; }
  catch (e) { return { sol: null, majorSoon: false, phase: null }; }   // no moon data
};
function todayScore(now) {
  now = now || new Date();
  const i = { ...solInfo(now), sun: sunNear(now, LAT, LNG) };
  const tides = window.homeTides;
  if (tides && tides.length > 1) {
    let a = null, b = null;
    for (let k = 0; k < tides.length - 1; k++) if (tides[k].when <= now && tides[k + 1].when > now) { a = tides[k]; b = tides[k + 1]; break; }
    if (a) {
      const fromTurn = Math.min(now - a.when, b.when - now) / 60000;
      if (fromTurn < 45) i.slack = a.high ? "high" : "low"; else i.flow = b.high ? "in" : "out";
    }
  }
  if (typeof cond !== "undefined") { i.mph = cond.windMph; i.trend = cond.pressureTrend; }
  return scoreCore(i);
}
// The same 0–10 for one saved spot at a moment `t` (its own tide times, sun and moon; forecast wind & pressure when we have them).
// `fh` = that hour of the spot's forecast (null = none: wind/pressure then come from Home's current numbers for "now", else are skipped).
function spotScoreAt(s, t, fh) {
  const f = factorsAt(s, t, fh), isNow = Math.abs(t - Date.now()) < 3600000;
  const i = { ...solInfo(t), sun: sunNear(t, s.lat, s.lng) };
  if (f.tide === "high slack") i.slack = "high"; else if (f.tide === "low slack") i.slack = "low";
  else if (f.tide === "incoming") i.flow = "in"; else if (f.tide === "outgoing") i.flow = "out";
  if (fh || isNow) { i.mph = f.mph; i.trend = f.trend; }
  const r = scoreCore(i);
  r.partial = !(fh || isNow);   // beyond the ~3-day forecast: moon, tide and light only
  return r;
}
// Hour of the spot's forecast for `t`, or null while it loads / is out of range
function spotFcHour(s, t) {
  try { const p = spotForecast(s); return p && Array.isArray(p.done) ? fcHour(p.done, t) : null; } catch (e) { return null; }
}
// A tappable "Fishing here now: 7/10 · Good  Why?" line for a spot card; refillSpotScores() redraws it when conditions refresh
function spotScoreLine(s) {
  const box = el("div", "ts-spot"); box.dataset.spot = s.id;
  const fill = () => {
    if (!hasLoc(s)) { box.hidden = true; return; }
    const now = new Date(), r = spotScoreAt(s, now, spotFcHour(s, now));
    const open = !!box.querySelector(".ts-why:not([hidden])");
    box.innerHTML = ""; box.dataset.lvl = r.word.toLowerCase();
    const b = el("button", "ts-spot-btn"); b.type = "button";
    b.innerHTML = `<span class="ts-mini">${r.score}</span><b class="ts-spot-t">Fishing here now: ${r.score}/10 · ${r.word}</b><span class="ts-more">Why?</span>`;
    const list = el("div", "ts-why"); list.hidden = !open;
    r.why.forEach(x => list.appendChild(el("div", "ts-row " + (x.n > 0 ? "up" : x.n < 0 ? "down" : ""), (x.n > 0 ? "▲ " : x.n < 0 ? "▼ " : "• ") + x.text)));
    list.appendChild(el("div", "spot-meta", "General patterns for this spot's tide, wind, moon and light, not a promise."));
    b.addEventListener("click", () => { list.hidden = !list.hidden; });
    box.append(b, list);
  };
  fill(); box.refill = fill;
  return box;
}
function refillSpotScores() { document.querySelectorAll(".ts-spot[data-spot]").forEach(b => { if (b.refill) b.refill(); }); }

(function todayScoreCard() {
  const hn = $("hn"), condSec = $("hn-cond-sec"); if (!hn || !condSec) return;
  const sec = el("div", "hn-sec ts-sec"); sec.id = "ts-sec";
  const btn = el("button", "ts-btn"); btn.type = "button"; btn.id = "ts-btn"; btn.setAttribute("aria-expanded", "false");
  btn.innerHTML = '<span class="ts-ring" id="ts-num">–</span><span class="ts-t"><span class="hn-lab">Fishing right now</span><span class="hn-big" id="ts-word">Checking…</span><span class="ts-top" id="ts-top"></span></span><span class="ts-more">Why?</span>';
  const list = el("div", "ts-why"); list.id = "ts-why"; list.hidden = true;
  sec.append(btn, list);
  hn.insertBefore(sec, condSec);
  btn.addEventListener("click", () => { list.hidden = !list.hidden; btn.setAttribute("aria-expanded", String(!list.hidden)); });

  function render() {
    const r = todayScore();
    $("ts-num").textContent = String(r.score);
    sec.dataset.lvl = r.word.toLowerCase();
    $("ts-word").textContent = `${r.score}/10 · ${r.word}`;
    const best = r.why.filter(x => x.n > 0).sort((a, b) => b.n - a.n)[0], worst = r.why.filter(x => x.n < 0).sort((a, b) => a.n - b.n)[0];
    $("ts-top").textContent = [best, worst].filter(Boolean).map(x => x.text).join(" · ");
    list.innerHTML = "";
    r.why.forEach(x => list.appendChild(el("div", "ts-row " + (x.n > 0 ? "up" : x.n < 0 ? "down" : ""), (x.n > 0 ? "▲ " : x.n < 0 ? "▼ " : "• ") + x.text)));
    list.appendChild(el("div", "spot-meta", "General fishing patterns for your area, not a promise. Your best spots below use your own catches."));
  }
  window.todayScoreRender = render;
  ["ts-wind", "ts-tide", "wx-pressure"].forEach(id => { const e = $(id); if (e) new MutationObserver(render).observe(e, { childList: true, characterData: true, subtree: true }); });
  setInterval(render, 5 * 60000);
  render();
})();
