// Tide times for the morning alert, read in UTC like the app does (js/01-core.js parseNoaa).
// NOAA is asked for time_zone=gmt, so "2026-10-08 11:24" is the same real moment for every station and every angler.
// We then turn that moment into the ANGLER's own wall-clock minutes (their time zone, DST included), counted from
// midnight of "today" there: yesterday is negative, tomorrow is 1440 and up. Same shape the scoring code already expects.

const fmts = {};
function localParts(ms, tz) {
  const f = fmts[tz] || (fmts[tz] = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }));
  const o = {};
  for (const p of f.formatToParts(new Date(ms))) o[p.type] = p.value;
  return { date: `${o.year}-${o.month}-${o.day}`, minutes: +o.hour * 60 + +o.minute };
}

// predictions: NOAA rows like { t: "2026-10-08 11:24", type: "H" } (times in UTC). today: "yyyy-mm-dd" in the angler's zone.
// Returns [{ m, type }] sorted by m.
export function tideEventsLocal(predictions, today, tz) {
  const base = Date.parse(today + "T00:00:00Z");
  return (predictions || []).map((x) => {
    const [d, t] = String(x.t).split(" ");
    const lp = localParts(Date.parse(d + "T" + t + ":00Z"), tz);
    const days = Math.round((Date.parse(lp.date + "T00:00:00Z") - base) / 86400000);
    return { m: days * 1440 + lp.minutes, type: x.type };
  }).sort((a, b) => a.m - b.m);
}

// NOAA begin/end dates (yyyymmdd) are UTC dates when time_zone=gmt. The angler's yesterday..tomorrow can reach into the
// UTC day after tomorrow (evening tides in the Americas), so ask for UTC yesterday through two days ahead.
export function noaaDateRange(today) {
  const base = Date.parse(today + "T00:00:00Z");
  const f = (n) => new Date(base + n * 86400000).toISOString().slice(0, 10).replace(/-/g, "");
  return { begin: f(-1), end: f(2) };
}
