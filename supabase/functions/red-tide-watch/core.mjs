// Red tide helpers shared by the alert function (index.ts) and checked against the app copy in js/30-red-tide.js (tests/test118.js).
// Data: FWC-FWRI "Karenia brevis cells per liter" — one dot per water sample from the last 8 days, refreshed daily (about 4:45 PM Eastern).
export const RT_LEVELS = ["Not present", "Very low", "Low", "Medium", "High"];
export const RT_MAX_AGE_DAYS = 8;      // FWC's whole window; samples are patchy (often a week apart), and the banner / alert always say how old the sample is
export const RT_NEAR_MI = 15;          // "near you" = within this many miles of where you are / fish
export const RT_ALERT_LEVEL = 3;       // alerts and the banner start at Medium

// FWC's Abundance text -> 0 not present · 1 very low · 2 low · 3 medium · 4 high · -1 unknown (ignored)
export function rtLevel(a) {
  const s = String(a == null ? "" : a).toLowerCase();
  if (/not present|background/.test(s)) return 0;
  if (/very low/.test(s)) return 1;
  if (/\blow\b/.test(s)) return 2;
  if (/medium/.test(s)) return 3;
  if (/\bhigh\b/.test(s)) return 4;
  return -1;
}
// "Oct 14, 2026", "10/14/2026" or "2026-10-14" -> ms, else null (unreadable dates are treated as recent: the service only holds 8 days)
export function rtDate(t) {
  const s = String(t == null ? "" : t).trim();
  if (!s) return null;
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (m) return new Date(+m[3], +m[1] - 1, +m[2], 12).getTime();
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], 12).getTime();
  const p = Date.parse(s);
  return isFinite(p) ? p + 12 * 3600000 : null;
}
export function rtMiles(a, b, c, d) {
  const R = 3958.8, r = Math.PI / 180, dl = (c - a) * r, dg = (d - b) * r;
  const h = Math.sin(dl / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dg / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// samples: [{ lat, lng, level, ms|null, place }] -> the worst level near (lat, lng), how far, when, and counts by level; null if nothing readable is near
export function rtSummary(samples, lat, lng, now, radiusMi = RT_NEAR_MI, maxAgeDays = RT_MAX_AGE_DAYS) {
  const near = [];
  for (const s of samples) {
    if (s.level < 0 || !isFinite(s.lat) || !isFinite(s.lng)) continue;
    if (s.ms != null && now - s.ms > maxAgeDays * 86400000) continue;
    const mi = rtMiles(lat, lng, s.lat, s.lng);
    if (mi <= radiusMi) near.push({ ...s, mi });
  }
  if (!near.length) return null;
  const level = Math.max(...near.map(s => s.level));
  const worst = near.filter(s => s.level === level).sort((a, b) => a.mi - b.mi)[0];
  const counts = [0, 0, 0, 0, 0];
  near.forEach(s => counts[s.level]++);
  return { level, mi: worst.mi, ms: worst.ms, place: worst.place || "", n: near.length, counts };
}
