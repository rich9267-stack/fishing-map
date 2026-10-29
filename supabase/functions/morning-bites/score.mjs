// Morning bite planner — pure scoring, no network. All times are LOCAL minutes since midnight.
// Each hour of the day gets points for: moving tide, dawn/dusk light, falling pressure, light wind,
// and (from the person's own catches at that spot) the hour and tide they have really caught fish in.

export const WIND_OK_MPH = 12;      // at or under this counts as "light wind"
export const WIND_VETO_MPH = 20;    // over this nothing is worth a buzz
export const MIN_SCORE = 3;         // an alert needs at least this many points in one window...
export const STRONG_SCORE = 4;      // ...and either this many, or a rarer reason (falling pressure / your own history)
const RARE = /falling pressure|your best time|you catch on/;
const SLACK_MIN = 45;               // within this many minutes of a high/low the water is "slack", not moving

export const hm = m => { // 390 -> "6:30am"
  m = Math.max(0, Math.min(1439, Math.round(m)));
  const h = Math.floor(m / 60), mm = String(m % 60).padStart(2, "0");
  return `${((h + 11) % 12) + 1}:${mm}${h < 12 ? "am" : "pm"}`;
};
const hLabel = h => `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}`;

// tides: [{ m: minutes (can be <0 or >1440), type: "H"|"L" }] sorted by m
export function tideAt(tides, m) {
  if (!tides || tides.length < 2) return null;
  let prev = null, next = null;
  for (const t of tides) { if (t.m <= m) prev = t; else { next = t; break; } }
  if (!prev || !next) return null;
  const slack = Math.min(m - prev.m, next.m - m) < SLACK_MIN;
  return { stage: slack ? (Math.abs(m - prev.m) <= Math.abs(next.m - m) ? prev : next).type === "H" ? "high slack" : "low slack" : (next.type === "H" ? "incoming" : "outgoing"), moving: !slack };
}

export function scoreHour(spot, h, day, histInfo) {
  const m = h * 60 + 30; // middle of the hour
  const pts = []; let score = 0;
  const wind = day.wind[h];
  if (wind != null && wind > WIND_VETO_MPH) return { score: 0, pts: [], veto: true };
  const salty = spot.water_type !== "freshwater";
  let stage = null;
  if (salty && day.tides) {
    const t = tideAt(day.tides, m - (spot.tide_offset_min || 0));
    if (t) { stage = t.stage; if (t.moving) { score++; pts.push(`${t.stage} tide`); } }
  }
  const dawn = day.sunrise != null && m >= day.sunrise - 30 && m <= day.sunrise + 90;
  const dusk = day.sunset != null && m >= day.sunset - 90 && m <= day.sunset + 30;
  if (dawn) { score++; pts.push("dawn light"); } else if (dusk) { score++; pts.push("dusk light"); }
  const p = day.pressure, p0 = p[h], p3 = p[h - 3];
  if (p0 != null && p3 != null && p0 - p3 <= -1.0) { score++; pts.push("falling pressure"); }
  if (wind != null && wind <= WIND_OK_MPH) { score++; pts.push(`light wind (${Math.round(wind)} mph)`); }
  // Own history at this spot: how much more often than chance did the fish come at this time / on this tide?
  if (histInfo && histInfo.total >= 6) {
    const block = histInfo.byBlock[Math.floor(h / 3)] || 0;
    if (block / histInfo.total >= 2 * (3 / 24)) { score++; pts.push("your best time here"); }
    if (stage && stage !== "") {
      const base = (stage === "incoming" || stage === "outgoing") ? 0.42 : 0.08;
      const share = (histInfo.byTide[stage] || 0) / histInfo.total;
      if (share / base >= 1.6 && histInfo.byTide[stage] >= 3) { score++; pts.push(`you catch on the ${stage} tide here`); }
    }
  }
  return { score, pts };
}

export function histFor(hist) { // [{spot_id, hour, tide, n}] -> {spot_id: {total, byBlock[8], byTide{}}}
  const out = {};
  for (const r of hist || []) {
    const o = out[r.spot_id] || (out[r.spot_id] = { total: 0, byBlock: Array(8).fill(0), byTide: {} });
    const n = r.n || 1;
    o.total += n; o.byBlock[Math.floor((r.hour || 0) / 3)] += n;
    if (r.tide) o.byTide[r.tide] = (o.byTide[r.tide] || 0) + n;
  }
  return out;
}

// day: { sunrise, sunset (minutes), wind[24], pressure: array indexed so pressure[h] works for h = -3..23, tides }
export function planDay(spots, hist, day, from = 5, to = 20) {
  const hi = histFor(hist);
  const results = [];
  for (const s of spots) {
    const rows = [];
    for (let h = from; h <= to; h++) rows.push({ h, ...scoreHour(s, h, day, hi[s.id]) });
    const best = Math.max(...rows.map(r => r.score));
    if (best < MIN_SCORE) continue;
    const rare = r => r.pts.some(t => RARE.test(t));
    const tops = rows.filter(r => r.score === best);
    // tide + light + light wind happens almost every day — only worth a buzz at 4+ points or with a rarer reason
    // (a spot you follow ⭐ gets a buzz at 3 points too — that's what following it means)
    if (best < STRONG_SCORE && !tops.some(rare) && !s.followed) continue;
    const peak = tops.find(rare) || tops[0];
    let a = peak.h, b = peak.h;
    while (a - 1 >= from && rows.find(r => r.h === a - 1).score >= best - 1 && b - a < 3) a--;
    while (b + 1 <= to && rows.find(r => r.h === b + 1).score >= best - 1 && b - a < 3) b++;
    results.push({ spot: s, score: best, from: a, to: b + 1, reasons: [...peak.pts].sort((x, y) => (RARE.test(y) ? 1 : 0) - (RARE.test(x) ? 1 : 0)) }); // the unusual reasons lead
  }
  results.sort((x, y) => y.score - x.score || (y.spot.followed ? 1 : 0) - (x.spot.followed ? 1 : 0) || (y.spot.mine ? 1 : 0) - (x.spot.mine ? 1 : 0));
  return results;
}

// The 0–10 number Home shows (js/67 todayScore), worked out for one hour of a planned day so the evening alert speaks the same language.
// Same points as js/67: start at 5; moving tide +1.5 / slack −0.5; wind over 20 −2.5, over 15 −1, 6–15 +1, lighter +0.5;
// pressure over 3 h falling +1.5 / rising −1 / steady +0.5; new or full moon +0.5; within 90 min of sunrise or sunset +1.
// (Home also adds solunar feeding times; the server has no moon-position maths, so it leaves that out — it can only be a little lower.)
// v245: dark (outside daylight, away from sunrise/sunset) −1; lake or canal (no tide) +0.75. Spot cards add catches/season/water temp on top.
export function moonPhaseName(date) {
  const p = (((date.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000 / 29.530588853) % 1 + 1) % 1;
  return p < 0.03 || p > 0.97 ? "new moon" : p >= 0.47 && p < 0.53 ? "full moon" : "";
}
export function tenScore(spot, h, day) {
  const m = h * 60 + 30; let s = 5;
  if (spot.water_type !== "freshwater" && day.tides) { const t = tideAt(day.tides, m - (spot.tide_offset_min || 0)); if (t) s += t.moving ? 1.5 : -0.5; }
  const w = day.wind[h];
  if (w != null) s += w > 20 ? -2.5 : w > 15 ? -1 : w >= 6 ? 1 : 0.5;
  const p0 = day.pressure[h], p3 = day.pressure[h - 3];
  if (p0 != null && p3 != null) s += p0 - p3 <= -1.0 ? 1.5 : p0 - p3 >= 1.0 ? -1 : 0.5;
  if (day.moon === "new moon" || day.moon === "full moon") s += 0.5;
  if ((day.sunrise != null && Math.abs(m - day.sunrise) < 90) || (day.sunset != null && Math.abs(m - day.sunset) < 90)) s += 1;
  else if (day.sunrise != null && day.sunset != null && (m < day.sunrise || m > day.sunset)) s -= 1;   // v245: dark −1 (as the app's js/67)
  if (spot.water_type === "freshwater") s += 0.75;   // v245: no tide at a lake or canal, counted as average
  return Math.max(0, Math.min(10, Math.round(s)));
}

// Evening heads-up: tomorrow at your favourite spot(s) — ⭐ followed ones, or your own when you follow none
// Only on better-than-ordinary days: 4+ points or a rarer reason (a followed spot's 3-point "ordinary" day is not enough here,
// or it would buzz nearly every evening), and 7/10 or more.
export function composeEvening(results, day) {
  const r = results.find(x => x.score >= STRONG_SCORE || x.reasons.some(t => RARE.test(t)));
  if (!r) return null;
  const best = Math.max(...Array.from({ length: r.to - r.from }, (_, i) => tenScore(r.spot, r.from + i, day)));
  if (best < 7) return null;
  return { title: "🌅 Tomorrow looks good", body: `${r.spot.followed ? "⭐ " : ""}${r.spot.name} ${hLabel(r.from)}–${hLabel(r.to)}: ${r.reasons.slice(0, 3).join(", ")} · ${best}/10`, spotId: r.spot.id, ten: best };
}

// ⏰ Heads-up (setup/114): a strong window at a ⭐ followed spot that starts 1–2 hours from now (nowMin = minutes since local midnight).
// Same bar as the evening alert: 4+ points or a rarer reason, and 7/10 or more. `results` should come from planDay for today.
export function composeHeadsUp(results, day, nowMin) {
  const r = results.find(x => x.spot.followed && x.from * 60 - nowMin >= 60 && x.from * 60 - nowMin <= 120 && (x.score >= STRONG_SCORE || x.reasons.some(t => RARE.test(t))));
  if (!r) return null;
  const best = Math.max(...Array.from({ length: r.to - r.from }, (_, i) => tenScore(r.spot, r.from + i, day)));
  if (best < 7) return null;
  return { title: "⏰ Bite window soon", body: `⭐ ${r.spot.name} ${hLabel(r.from)}–${hLabel(r.to)}: ${r.reasons.slice(0, 3).join(", ")} · ${best}/10`, spotId: r.spot.id, ten: best };
}

// One short alert: the best of your own spots, plus the best new spot nearby (if any)
export function composeAlert(results) {
  if (!results.length) return null;
  const mine = results.find(r => r.spot.mine), fresh = results.find(r => !r.spot.mine);
  const top = results[0];
  const win = r => `${hLabel(r.from)}–${hLabel(r.to)}`;
  const fol = results.find(r => r.spot.followed);
  const first = fol && fol.score >= top.score - 1 ? fol : mine && (!fresh || mine.score >= fresh.score - 1) ? mine : top;
  let body = `${first.spot.followed ? "⭐ " : ""}${first.spot.name} ${win(first)}: ${first.reasons.slice(0, 3).join(", ")}`;
  const other = first === fresh ? (fol && fol !== first ? fol : mine) : fresh;
  if (other && other.spot.id !== first.spot.id) body += ` · ${other.spot.followed || other.spot.mine ? "Also" : "New to try"}: ${other.spot.followed ? "⭐ " : ""}${other.spot.name} ${win(other)}`;
  return { title: "🎣 Good bite window today", body, spotId: first.spot.id };
}
