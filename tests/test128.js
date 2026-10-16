// test128: time zones (sprint #4 — the Panhandle west of the Apalachicola River is on Central time).
// Runs the app's REAL tide / weather / water-temperature lookups against a fake NOAA and a fake Open-Meteo that
// answer in whatever time zone they are asked for, and checks the answers are right on an Eastern phone AND a Central phone.
//   node test128.js                       (Eastern phone)
//   TZ=America/Chicago node test128.js    (Central phone)
process.env.TZ = process.env.TZ || "America/New_York";
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const read = f => fs.readFileSync(path.join(__dirname, "..", "js", f), "utf8");
const S01 = read("01-core.js"), S02 = read("02-spots.js"), S06 = read("06-catching.js");

// ---- pull pieces of the real code out of the js files ----
function fn(src, name, optional) {
  const m = new RegExp("^ *(async )?function " + name + "\\(", "m").exec(src);
  if (!m) { if (optional) return ""; throw new Error("cannot find function " + name); }
  let i = src.indexOf("{", m.index), depth = 0;
  for (; i < src.length; i++) { if (src[i] === "{") depth++; else if (src[i] === "}") { depth--; if (!depth) break; } }
  return src.slice(m.index, i + 1);
}
function line(src, re, optional) { const m = re.exec(src); if (!m) { if (optional) return ""; throw new Error("cannot find " + re); } return m[0]; }
function arr(src, name) { const s = src.indexOf("const " + name + " = ["); return src.slice(s, src.indexOf("\n  ];", s) + 5); }

// ---- the fake internet ----
const TZ = { "8729840": "America/Chicago", "8720218": "America/New_York" };   // Pensacola (Central), Mayport (Eastern)
// (a station the fake does not list answers in Eastern time, like the rest of Florida)
const pad = n => String(n).padStart(2, "0");
function fmt(ms, tz) {   // "2026-10-16 09:00" in that zone
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}
function midnight(yyyymmdd, tz) {   // the real moment a calendar day starts in a zone
  const y = +yyyymmdd.slice(0, 4), m = +yyyymmdd.slice(4, 6) - 1, d = +yyyymmdd.slice(6, 8);
  for (let h = -16; h <= 16; h++) { const t = Date.UTC(y, m, d, 0, 0) + h * 3600000; if (fmt(t, tz) === `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)} 00:00`) return t; }
  throw new Error("midnight?");
}
const EVENTS = [];   // real high/low tides, every 6 hours: high at 02:00Z, 14:00Z …; low at 08:00Z, 20:00Z …
for (let k = -10; k <= 20; k++) EVENTS.push({ t: Date.UTC(2026, 9, 14, 2, 0) + k * 6 * 3600000, high: k % 2 === 0 });
const urls = [];
async function fakeFetch(url) {
  urls.push(url);
  const u = new URL(url), q = k => u.searchParams.get(k);
  const json = o => ({ ok: true, json: async () => o });
  if (u.hostname === "api.tidesandcurrents.noaa.gov") {
    const tz = q("time_zone") === "gmt" ? "UTC" : (TZ[q("station")] || "America/New_York");
    if (q("product") === "predictions") {
      const start = midnight(q("begin_date"), tz), end = start + (+q("range")) * 3600000;
      return json({ predictions: EVENTS.filter(e => e.t >= start && e.t <= end).map(e => ({ t: fmt(e.t, tz), v: "1.0", type: e.high ? "H" : "L" })) });
    }
    if (q("product") === "water_temperature") {
      const start = midnight(q("begin_date"), tz), end = midnight(q("end_date"), tz) + 24 * 3600000 - 1;
      const rows = [];
      for (let t = Math.ceil(start / 3600000) * 3600000; t <= end; t += 3600000) rows.push({ t: fmt(t, tz), v: (70 + (t / 3600000) % 10 / 10).toFixed(1) });
      return json({ data: rows });
    }
  }
  if (u.hostname.endsWith("open-meteo.com") && q("hourly")) {
    const tz = q("timezone") === "GMT" || q("timezone") === "UTC" ? "UTC" : q("timezone");
    const d0 = q("start_date"), d1 = q("end_date"), time = [], pressure = [], zero = [];
    for (let t = Date.UTC(2026, 9, 13); t < Date.UTC(2026, 9, 19); t += 3600000) {
      const s = fmt(t, tz), day = s.slice(0, 10);
      if (day >= d0 && day <= d1) { time.push(s.replace(" ", "T")); pressure.push(1000 + (t - Date.UTC(2026, 9, 1)) / 3600000); zero.push(5); }
    }
    return json({ hourly: { time, pressure_msl: pressure, wind_speed_10m: zero, wind_direction_10m: zero, temperature_2m: zero } });
  }
  throw new Error("test128 fake has no answer for " + url);
}

// ---- the real code ----
const code = [
  line(S01, /^ *function ymd\(d\) \{[\s\S]*?\n  \}/m),
  fn(S01, "ymdUtc", true), fn(S01, "parseNoaa"),
  line(S06, /^ *const pad2 = .*$/m), line(S06, /^ *const ymdDash = .*$/m), line(S06, /^ *const ymdDashUtc = .*$/m, true),
  fn(S06, "compass"), fn(S06, "tideStageAt"), fn(S06, "weatherAt"),
  fn(S02, "miles"), arr(S02, "WT_STATIONS"),
  line(S02, /^ *const WT_RANGE = .*$/m), line(S02, /^ *const WT_STATION_MI = .*$/m), line(S02, /^ *const okTemp = .*$/m),
  fn(S02, "wtSourceFor"), fn(S02, "waterTempAt"),
  "this.api = { tideStageAt, weatherAt, waterTempAt };"
].join("\n");
const ctx = vm.createContext({ fetch: fakeFetch, STATION: "8722859", LAT: 26.24, LNG: -80.1, console,
  satTempNow: async () => null, erddapJson: async () => { throw new Error("offline"); }, Date, Math, Intl, URL });
vm.runInContext(code, ctx);
const { tideStageAt, weatherAt, waterTempAt } = ctx.api;

let bad = "";
const need = (c, m) => { if (!c) { bad += "\n  ✗ " + m; console.log("FAIL:", m); } };
const zoneName = process.env.TZ;
console.log("phone time zone:", zoneName);

(async () => {
  // A. tide stage. 19:45 UTC is 15 minutes before a LOW tide (20:00 UTC), so the stage is "low slack" — whatever the station or phone zone.
  const when = new Date(Date.UTC(2026, 9, 16, 19, 45));
  for (const [label, id] of [["Pensacola (Central station)", "8729840"], ["Mayport (Eastern station)", "8720218"]]) {
    let r; try { r = await tideStageAt(when, id, 0); } catch (e) { r = "error: " + e.message; }
    need(r === "low slack", label + " on a " + zoneName + " phone: 15 min before low tide should say 'low slack', got " + r);
  }
  // …and an hour later it is a rising tide
  const later = new Date(Date.UTC(2026, 9, 16, 21, 30));
  need(await tideStageAt(later, "8729840", 0) === "incoming", "Pensacola 90 min after low tide is 'incoming'");

  // B. weather for that real moment (the fake gives every hour its own pressure, so the wrong hour is easy to spot)
  const wantHour = Date.UTC(2026, 9, 16, 19, 0);
  const wantP = Math.round((1000 + (wantHour - Date.UTC(2026, 9, 1)) / 3600000) / 33.8639 * 100) / 100;
  for (const [label, lat, lng] of [["Pensacola", 30.4, -87.2], ["Pompano", 26.24, -80.1]]) {
    let r; try { r = await weatherAt(when, lat, lng); } catch (e) { r = { error: e.message }; }
    need(r.pressure === wantP, label + " weather on a " + zoneName + " phone should be for 19:00 UTC (pressure " + wantP + "), got " + JSON.stringify(r));
  }

  // C. water temperature in the evening (22:20 Eastern = next day in UTC): the day boundary must not lose it
  const eve = new Date(Date.UTC(2026, 9, 17, 2, 20));
  const wantT = Math.round((70 + (Date.UTC(2026, 9, 17, 2, 0) / 3600000) % 10 / 10) * 10) / 10;
  let w; try { w = await waterTempAt(30.3982, -81.4279, eve); } catch (e) { w = { error: e.message }; }
  need(w && w.f === wantT && /Mayport/.test(w.source || ""), "Mayport evening water temperature should be " + wantT + " from the station, got " + JSON.stringify(w));

  // D. the same for a Central-time station: Pensacola, 8:20 pm Central (= 01:20 UTC the next day)
  const peval = new Date(Date.UTC(2026, 9, 17, 1, 20));
  const wantP2 = Math.round((70 + (Date.UTC(2026, 9, 17, 1, 0) / 3600000) % 10 / 10) * 10) / 10;
  let w2; try { w2 = await waterTempAt(30.4044, -87.2112, peval); } catch (e) { w2 = { error: e.message }; }
  need(w2 && w2.f === wantP2 && /Pensacola/.test(w2.source || ""), "Pensacola evening water temperature should be " + wantP2 + " from the station, got " + JSON.stringify(w2));

  // E. every NOAA request the app makes asks for UTC (so no station or phone zone can shift a time)
  const noaa = urls.filter(u => u.includes("api.tidesandcurrents.noaa.gov/api/prod/datagetter"));
  need(noaa.length >= 4 && noaa.every(u => u.includes("time_zone=gmt")), "all " + noaa.length + " NOAA time requests use time_zone=gmt");

  console.log(bad ? "FAIL:" + bad : "OK");
  process.exit(bad ? 1 : 0);
})();
