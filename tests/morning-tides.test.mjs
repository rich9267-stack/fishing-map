// Morning alert: tide times are read in UTC and shown on the ANGLER's clock (see supabase/functions/morning-bites/tides.mjs).
// Run: cd tests && node morning-tides.test.mjs   (every line should start with "ok")
import { tideEventsLocal, noaaDateRange } from "../supabase/functions/morning-bites/tides.mjs";
import { tideAt } from "../supabase/functions/morning-bites/score.mjs";
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const clock = (m) => { const h = Math.floor(((m % 1440) + 1440) % 1440 / 60), mm = String(((m % 60) + 60) % 60).padStart(2, "0"); return (h % 12 || 12) + ":" + mm + (h < 12 ? "am" : "pm"); };
const one = (t, tz, today) => tideEventsLocal([{ t, type: "H" }], today, tz)[0].m;
const TODAY = "2026-10-16";

// 1. The same NOAA moment (UTC) lands on each angler's own clock, whatever zone the station is in.
//    A Pensacola high tide at 1:12pm Central (CDT) is 18:12 UTC.
ok(one("2026-10-16 18:12", "America/New_York", TODAY) === 14 * 60 + 12, "Pensacola high tide (1:12pm Central) shows as 2:12pm for an Eastern angler");
ok(one("2026-10-16 18:12", "America/Chicago", TODAY) === 13 * 60 + 12, "the same tide shows as 1:12pm for a Central angler");
ok(one("2026-10-16 18:12", "America/Chicago", TODAY) === one("2026-10-16 18:12", "America/New_York", TODAY) - 60, "Central angler is exactly one hour behind Eastern");

// 2. Yesterday is negative, tomorrow is 1440 and up, and late-evening tides that are already "tomorrow" in UTC still count as today.
ok(one("2026-10-15 20:00", "America/New_York", TODAY) === -1440 + 16 * 60, "yesterday 4:00pm Eastern = " + (-1440 + 960));
ok(one("2026-10-17 02:00", "America/New_York", TODAY) === 22 * 60, "10:00pm Eastern tonight is 02:00 UTC tomorrow, still counted as today");
ok(one("2026-10-18 03:00", "America/New_York", TODAY) === 1440 + 23 * 60, "tomorrow 11:00pm Eastern = " + (1440 + 1380));

// 3. The date range asked from NOAA reaches far enough for tomorrow evening.
const r = noaaDateRange(TODAY);
ok(r.begin === "20261015" && r.end === "20261018", "NOAA asked for UTC dates " + r.begin + " to " + r.end);
ok(Number(r.end) >= 20261018, "range includes the UTC day that holds tomorrow's late-evening tide");

// 4. Clocks change: Sunday Nov 1 2026 (Eastern falls back at 2am). Wall-clock minutes must follow the new clock.
const D = "2026-11-01";
ok(one("2026-11-01 05:30", "America/New_York", D) === 90, "Nov 1: 05:30 UTC is 1:30am (still daylight time)");
ok(one("2026-11-01 11:00", "America/New_York", D) === 360, "Nov 1: 11:00 UTC is 6:00am (standard time), not 7:00am");

// 5. Sorted, types kept, empty input safe.
const mixed = tideEventsLocal([{ t: "2026-10-17 00:40", type: "L" }, { t: "2026-10-16 11:00", type: "L" }, { t: "2026-10-16 18:12", type: "H" }], TODAY, "America/New_York");
ok(mixed.map((x) => x.type).join("") === "LHL" && mixed[0].m < mixed[1].m && mixed[1].m < mixed[2].m, "events come back in time order with H/L kept");
ok(tideEventsLocal([], TODAY, "America/New_York").length === 0 && tideEventsLocal(undefined, TODAY, "America/New_York").length === 0, "no predictions = empty list, no crash");

// 6. The scoring code can use the result (rising tide between the 7:00am low and the 2:12pm high).
ok(tideAt(mixed, 600) && tideAt(mixed, 600).stage === "incoming", "at 10:00am the planner sees an incoming tide: " + (tideAt(mixed, 600) || {}).stage);

console.log("\nIn plain words: " + mixed.map((x) => (x.type === "H" ? "high" : "low") + " at " + clock(x.m)).join(", ") + " (Eastern angler, " + TODAY + ")");
console.log(bad ? "\nSOME FAILED" : "\nALL OK");
process.exit(bad ? 1 : 0);
