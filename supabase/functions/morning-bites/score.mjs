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
    if (best < STRONG_SCORE && !tops.some(rare)) continue;
    const peak = tops.find(rare) || tops[0];
    let a = peak.h, b = peak.h;
    while (a - 1 >= from && rows.find(r => r.h === a - 1).score >= best - 1 && b - a < 3) a--;
    while (b + 1 <= to && rows.find(r => r.h === b + 1).score >= best - 1 && b - a < 3) b++;
    results.push({ spot: s, score: best, from: a, to: b + 1, reasons: [...peak.pts].sort((x, y) => (RARE.test(y) ? 1 : 0) - (RARE.test(x) ? 1 : 0)) }); // the unusual reasons lead
  }
  results.sort((x, y) => y.score - x.score || (y.spot.mine ? 1 : 0) - (x.spot.mine ? 1 : 0));
  return results;
}

// One short alert: the best of your own spots, plus the best new spot nearby (if any)
export function composeAlert(results) {
  if (!results.length) return null;
  const mine = results.find(r => r.spot.mine), fresh = results.find(r => !r.spot.mine);
  const top = results[0];
  const win = r => `${hLabel(r.from)}–${hLabel(r.to)}`;
  const first = mine && (!fresh || mine.score >= fresh.score - 1) ? mine : top;
  let body = `${first.spot.name} ${win(first)}: ${first.reasons.slice(0, 3).join(", ")}`;
  const other = first === fresh ? mine : fresh;
  if (other && other.spot.id !== first.spot.id) body += ` · ${other.spot.mine ? "Also" : "New to try"}: ${other.spot.name} ${win(other)}`;
  return { title: "🎣 Good bite window today", body, spotId: first.spot.id };
}
