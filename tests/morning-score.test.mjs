import { planDay, composeAlert, tideAt, hm, scoreHour } from "../supabase/functions/morning-bites/score.mjs";
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const flat = v => Array.from({ length: 24 }, () => v);
const pressure = {}; for (let h = -3; h < 24; h++) pressure[h] = 1015;
const day = { sunrise: 7 * 60, sunset: 18 * 60 + 30, wind: flat(8), pressure,
  tides: [{ m: -400, type: "L" }, { m: 120, type: "H" }, { m: 540, type: "L" }, { m: 800, type: "H" }, { m: 1200, type: "L" }, { m: 1500, type: "H" }] };
const spots = [{ id: "a", name: "Hillsboro Inlet", water_type: "saltwater", mine: true }, { id: "b", name: "C-14 Canal", water_type: "freshwater", mine: true },
  { id: "c", name: "Newbie Pier", water_type: "saltwater", mine: false }];
ok(tideAt(day.tides, 300).stage === "outgoing", "tide between H and L is outgoing");
ok(tideAt(day.tides, 540 + 20).stage === "low slack", "near a turn is slack");
ok(hm(390) === "6:30am" && hm(13 * 60) === "1:00pm", "time labels");
const falling0 = {}; for (let h = -3; h < 24; h++) falling0[h] = 1018 - (h + 3) * 0.5;
let r = planDay(spots, [], { ...day, pressure: falling0 });
ok(r.length >= 1 && r[0].score >= 3, "good day finds a window: " + JSON.stringify(r.map(x => [x.spot.name, x.score, x.from, x.to])));
ok(!r.find(x => x.spot.id === "b") || !r.find(x => x.spot.id === "b").reasons.some(t => /tide/.test(t)), "freshwater never gets tide points");
const dawnTide = scoreHour(spots[0], 7, day);
ok(dawnTide.pts.some(t => /dawn/.test(t)) && dawnTide.pts.some(t => /tide/.test(t)), "dawn + moving tide: " + dawnTide.pts.join("|"));
// an ordinary day (tide + light + light wind only) is not worth a buzz
ok(planDay(spots, [], day).length === 0, "ordinary 3-point day: no alert");
// windy day vetoes everything
r = planDay(spots, [], { ...day, wind: flat(25) });
ok(r.length === 0, "wind over 20 mph: no alert");
// falling pressure adds a point
const falling = {}; for (let h = -3; h < 24; h++) falling[h] = 1018 - (h + 3) * 0.5;
const s1 = scoreHour(spots[0], 7, { ...day, pressure: falling }), s0 = scoreHour(spots[0], 7, day);
ok(s1.score === s0.score + 1 && s1.pts.includes("falling pressure"), "falling pressure +1");
// history: caught mostly 6-9am on outgoing tide
const hist = []; for (let i = 0; i < 8; i++) hist.push({ spot_id: "a", hour: 6 + (i % 3), tide: "outgoing", n: 1 });
const h1 = scoreHour(spots[0], 7, day, { total: 8, byBlock: [0, 0, 8, 0, 0, 0, 0, 0], byTide: { outgoing: 8 } });
ok(h1.pts.includes("your best time here"), "history boosts best time: " + h1.pts.join("|"));
// too little history is ignored
ok(!scoreHour(spots[0], 7, day, { total: 3, byBlock: [0, 0, 3, 0, 0, 0, 0, 0], byTide: {} }).pts.includes("your best time here"), "tiny history ignored");
// quiet day -> null alert
const dull = { ...day, sunrise: null, sunset: null, tides: null, wind: flat(15) };
ok(composeAlert(planDay(spots, [], dull)) === null, "dull day: no alert");
const alert = composeAlert(planDay(spots, hist, day));
ok(alert && alert.title && alert.body.length < 200 && alert.spotId, "alert text: " + (alert && alert.body));
const withNew = composeAlert(planDay([spots[2], spots[0]], [], { ...day, pressure: falling0 }));
ok(withNew && /New to try|Hillsboro|Newbie/.test(withNew.body), "mixes new spot: " + (withNew && withNew.body));
process.exit(bad ? 1 : 0);
