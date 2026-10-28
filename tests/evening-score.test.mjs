// Evening "tomorrow looks good" alert (v213): the 0–10 number matches Home's rules, and the alert text.
import { planDay, tenScore, composeEvening, composeHeadsUp, moonPhaseName } from "../supabase/functions/morning-bites/score.mjs";
import fs from "node:fs";
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const flat = v => Array.from({ length: 24 }, () => v);
const steady = {}; for (let h = -3; h < 24; h++) steady[h] = 1015;
const falling = {}; for (let h = -3; h < 24; h++) falling[h] = 1018 - (h + 3) * 0.5;
const rising = {}; for (let h = -3; h < 24; h++) rising[h] = 1010 + (h + 3) * 0.5;
const tides = [{ m: -400, type: "L" }, { m: 120, type: "H" }, { m: 540, type: "L" }, { m: 800, type: "H" }, { m: 1200, type: "L" }, { m: 1500, type: "H" }];
const day = { sunrise: 7 * 60, sunset: 18 * 60 + 30, wind: flat(8), pressure: falling, tides, moon: "" };
const pier = { id: "a", name: "Hillsboro Inlet", water_type: "saltwater", followed: true }, lake = { id: "b", name: "Lake Ida", water_type: "freshwater", mine: true };

// 7am: moving tide +1.5, 8 mph +1, falling +1.5, sunrise +1 → 5 + 5 = 10
ok(tenScore(pier, 7, day) === 10, "dawn, moving tide, breeze, falling pressure = 10/10: " + tenScore(pier, 7, day));
// 9am (540 = low): slack −0.5, 8 mph +1, rising −1 → 4.5 → 5 (rounds like Home)
ok(tenScore(pier, 8, { ...day, pressure: rising, sunrise: null, sunset: null }) <= 5, "slack + rising pressure is middling");
ok(tenScore(pier, 12, { ...day, wind: flat(28), pressure: rising }) <= 3, "28 mph + rising pressure is low: " + tenScore(pier, 12, { ...day, wind: flat(28), pressure: rising }));
ok(tenScore(lake, 7, day) === tenScore({ ...pier, water_type: "freshwater" }, 7, day) && tenScore(lake, 7, day) < tenScore(pier, 7, day), "a lake never gets tide points");
ok(tenScore(pier, 12, { ...day, pressure: steady, moon: "full moon" }) - tenScore(pier, 12, { ...day, pressure: steady }) <= 1, "full moon adds a little");

// the same points as Home's todayScore (js/67): check the numbers in the code match
const js67 = fs.readFileSync(new URL("../js/67-today-score.js", import.meta.url), "utf8");
ok(/add\(-0\.5, `Slack tide/.test(js67) && /add\(1\.5, i\.flow/.test(js67) && /add\(-2\.5, `Too windy/.test(js67) && /add\(1\.5, "Pressure falling/.test(js67) && /add\(1, "Around sunrise"/.test(js67), "Home's score still uses the same points (keep js/67 and score.mjs in step)");

// moon names (known dates)
ok(moonPhaseName(new Date("2026-01-03T12:00:00Z")) === "full moon", "Jan 3 2026 is a full moon");
ok(moonPhaseName(new Date("2026-01-18T22:00:00Z")) === "new moon", "Jan 18 2026 is a new moon");
ok(moonPhaseName(new Date("2026-01-10T12:00:00Z")) === "", "Jan 10 2026 is neither");

// alert text: favourite spot first, window, reasons, x/10
const r = planDay([pier], [], day);
const al = composeEvening(r, day);
ok(al && al.title === "🌅 Tomorrow looks good" && /^⭐ Hillsboro Inlet \d+(am|pm)–\d+(am|pm): /.test(al.body) && / · \d+\/10$/.test(al.body) && al.spotId === "a", "alert text: " + (al && al.body));
ok(al.body.length <= 160, "fits in one phone alert (160 letters)");
ok(composeEvening(planDay([pier], [], { ...day, wind: flat(25) }), day) === null, "too windy all day: no alert");
const ordinary = { ...day, pressure: steady };
ok(planDay([pier], [], ordinary).length === 1 && composeEvening(planDay([pier], [], ordinary), ordinary) === null, "an ordinary day (tide + light + light wind) at a followed spot: the evening alert stays quiet");

// ⏰ heads-up (v228, setup/114): strong window at a followed spot starting 1–2 h from now, one alert text
const rt = planDay([pier], [], day), w0 = rt[0];
const startMin = w0.from * 60;
const hu = composeHeadsUp(rt, day, startMin - 90);
ok(hu && hu.title === "⏰ Bite window soon" && /^⭐ Hillsboro Inlet \d+(am|pm)–\d+(am|pm): /.test(hu.body) && / · \d+\/10$/.test(hu.body) && hu.spotId === "a" && hu.body.length <= 160, "heads-up text: " + (hu && hu.body));
ok(composeHeadsUp(rt, day, startMin - 61) && composeHeadsUp(rt, day, startMin - 120), "heads-up covers 1 to 2 hours ahead");
ok(composeHeadsUp(rt, day, startMin - 30) === null && composeHeadsUp(rt, day, startMin - 121) === null, "too soon or too early: no heads-up");
ok(composeHeadsUp(planDay([{ ...pier, followed: false, mine: true }], [], day), day, startMin - 90) === null, "a spot you don't follow never gets a heads-up");
ok(composeHeadsUp(planDay([pier], [], { ...day, wind: flat(25) }), day, startMin - 90) === null, "too windy: no heads-up");
ok(composeHeadsUp(planDay([pier], [], ordinary), ordinary, 4 * 60) === null, "an ordinary day stays quiet");
const sql = fs.readFileSync(new URL("../setup/114-bite-headsup.sql", import.meta.url), "utf8");
ok(/revoke all on function public\.headsup_due\(\), public\.headsup_mark\(uuid, date, boolean\) from public, anon, authenticated/.test(sql) && /'headsup'/.test(sql), "setup/114: functions locked down, kind added");
process.exit(bad ? 1 : 0);
