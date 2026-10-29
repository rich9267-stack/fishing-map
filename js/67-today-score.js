// ---- Today score on Home: one 0–10 number for "how good is fishing right now" (v211, plans/competitor-bite-audit.md) ----
// Works for everyone, even with no catches logged: it uses only general fishing patterns and what the app already loads
// (tide times, wind, pressure trend, moon / solunar, sunrise and sunset). The ranked spot list below still uses your own catches.
// No database change; nothing is saved.
// One scoring recipe for Home (right now, your area) and for a chosen spot + time (v227). Missing inputs (null) are simply skipped.
// in: { slack: "high"|"low"|null, flow: "in"|"out"|null, mph, trend, sol: "major"|"minor"|null, majorSoon, phase, sun: "sunrise"|"sunset"|null,
//       night, noTide, extra: [{ n, text }] }
// v245: night −1 (dark, away from sunrise/sunset); lakes and canals (noTide) +0.75 so the missing tide doesn't hold them near 5;
// extra = spot-only lines (catches at the spot, season, water temperature) from spotScoreAt. Home and the evening alert
// (supabase/functions/morning-bites/score.mjs tenScore) use the same night / no-tide rules.
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
  else if (i.night) add(-1, "Dark — most fish feed less at night");
  if (i.noTide) add(0.75, "No tide here (lake or canal) — counted as average");
  (i.extra || []).forEach(x => add(x.n, x.text));
  const score = Math.max(0, Math.min(10, Math.round(s)));
  const word = score >= 8 ? "Great" : score >= 6 ? "Good" : score >= 4 ? "Fair" : "Slow";
  return { score, word, why };
}
// dark = the sun more than 6° below the horizon (after dusk, before first light)
const isDark = (t, lat, lng) => { try { return SunCalc.getPosition(t, lat, lng).altitude < -6 * Math.PI / 180; } catch (e) { return false; } };
const q4 = n => Math.round(n * 4) / 4;   // quarter points read better in "Why?"
const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
// Spot-only lines (v245). Catches: how much now looks like the moments fish were caught here (same matching as 🏆 Best spots),
// or at spots with the same water when this one has fewer than 3 fish (half weight). Season / water temperature: the fish usually
// caught here (Best spots' extras). With no catches to go on, only a plain cold / very warm water line for salt and brackish spots.
function spotExtraLines(s, t, fh) {
  const out = [];
  let H = null; try { H = typeof historyFor === "function" ? historyFor(s) : null; } catch (e) { H = null; }
  if (H) {
    let r = null; try { r = scoreMoment(factorsAt(s, t, fh), H.hist, H.expo, spotStyle(s)); } catch (e) { r = null; }
    if (r) {
      const n = q4(clampN(r.score * (H.local ? 1 : 0.5), -1.5, 2));
      const top = r.reasons[0] ? " (" + r.reasons[0].text + ")" : "";
      if (n >= 0.25) out.push({ n, text: (H.local ? "Like when fish were caught here" : "Like catches at similar spots") + top });
      else if (n <= -0.25) out.push({ n, text: H.local ? "Not much like when fish were caught here" : "Not much like catches at similar spots" });
    }
    const ex = H.extra || { bonus: 0, notes: [] }, n = q4(clampN(ex.bonus * 1.5, -1, 1));
    const notes = (ex.notes || []).filter(x => !/^👀/.test(x)).slice(0, 2).join(" · ");
    if (Math.abs(n) >= 0.25 && notes) out.push({ n, text: notes });
    return out;
  }
  if (hasLoc(s) && s.water_type !== "freshwater" && typeof waterTempNow === "function") {
    const w = waterTempNow(s.lat, s.lng), f = w && w.done && w.done !== "error" ? Math.round(w.done.f) : null;
    if (f != null && f < 65) out.push({ n: -1, text: `Cold water (${f}°F) — fish slow down` });
    else if (f != null && f < 70) out.push({ n: -0.5, text: `Cool water (${f}°F)` });
    else if (f != null && f > 88) out.push({ n: -0.5, text: `Very warm water (${f}°F)` });
  }
  return out;
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
  const i = { ...solInfo(now), sun: sunNear(now, LAT, LNG), night: isDark(now, LAT, LNG) };
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
  const i = { ...solInfo(t), sun: sunNear(t, s.lat, s.lng), night: isDark(t, s.lat, s.lng), noTide: s.water_type === "freshwater", extra: spotExtraLines(s, t, fh) };
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
    list.appendChild(el("div", "spot-meta", "This spot's tide, wind, moon and light, plus the catches logged here and the season — a guide, not a promise."));
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
