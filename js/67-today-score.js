// ---- Today score on Home: one 0–10 number for "how good is fishing right now" (v211, plans/competitor-bite-audit.md) ----
// Works for everyone, even with no catches logged: it uses only general fishing patterns and what the app already loads
// (tide times, wind, pressure trend, moon / solunar, sunrise and sunset). The ranked spot list below still uses your own catches.
// No database change; nothing is saved.
function todayScore(now) {
  now = now || new Date();
  let s = 5; const why = [];
  const add = (n, text) => { s += n; why.push({ n, text }); };
  // Tide: moving water is better than slack (the hour around high or low)
  const tides = window.homeTides;
  if (tides && tides.length > 1) {
    let a = null, b = null;
    for (let i = 0; i < tides.length - 1; i++) if (tides[i].when <= now && tides[i + 1].when > now) { a = tides[i]; b = tides[i + 1]; break; }
    if (a) {
      const fromTurn = Math.min(now - a.when, b.when - now) / 60000;
      if (fromTurn < 45) add(-0.5, `Slack tide (${a.high ? "high" : "low"} turning)`);
      else add(1.5, b.high ? "Tide coming in" : "Tide going out");
    }
  }
  // Wind
  const mph = typeof cond !== "undefined" ? cond.windMph : null;
  if (mph != null) {
    if (mph > 20) add(-2.5, `Too windy (${mph} mph)`);
    else if (mph > 15) add(-1, `Breezy (${mph} mph)`);
    else if (mph >= 6) add(1, `Nice breeze (${mph} mph)`);
    else add(0.5, `Light wind (${mph} mph)`);
  }
  // Pressure trend
  const tr = typeof cond !== "undefined" ? cond.pressureTrend : null;
  if (tr === "falling") add(1.5, "Pressure falling — fish often feed");
  else if (tr === "rising") add(-1, "Pressure rising — often slower");
  else if (tr === "steady") add(0.5, "Pressure steady");
  // Solunar period now, or a major one soon
  try {
    const sol = solunarAt(now);
    if (sol === "major") add(1.5, "Major feeding time now");
    else if (sol === "minor") add(0.75, "Minor feeding time now");
    else if ([1, 2, 3].some(h => solunarAt(new Date(+now + h * 3600000)) === "major")) add(0.5, "Major feeding time within 3 hours");
  } catch (e) { /* no moon data */ }
  try { const ph = moonAt(now).phase; if (ph === "new moon" || ph === "full moon") add(0.5, cap(ph)); } catch (e) { /* no moon data */ }
  // Dawn and dusk
  try {
    const t = SunCalc.getTimes(now, LAT, LNG), near = x => x && Math.abs(now - x) < 90 * 60000;
    if (near(t.sunrise)) add(1, "Around sunrise");
    else if (near(t.sunset)) add(1, "Around sunset");
  } catch (e) { /* no sun data */ }
  const score = Math.max(0, Math.min(10, Math.round(s)));
  const word = score >= 8 ? "Great" : score >= 6 ? "Good" : score >= 4 ? "Fair" : "Slow";
  return { score, word, why };
}

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
