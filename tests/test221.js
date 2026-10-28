// test221: 🦈 more tank bodies (shark, gar, ray, puffer, eel) and markings (speckles, tail eye-spot) (v234).
const fs = require("fs");
const tankSrc = fs.readFileSync(__dirname + "/../js/14-tank.js", "utf8");
let bad = 0; const ok = (n, c) => { console.log((c ? "ok   " : "FAIL ") + n); if (!c) bad++; };

const T = new Function(tankSrc.match(/const TANK_LOOKS = \[[\s\S]*?\n  \];/)[0] + "\n" + tankSrc.match(/const TANK_SHAPES = \{[\s\S]*?\n  \};/)[0] + "; return { TANK_LOOKS, TANK_SHAPES };")();
const look = n => T.TANK_LOOKS.find(l => l.m.test(n.toLowerCase()));

["shark", "gar", "ray", "puffer", "eel"].forEach(k => { const s = T.TANK_SHAPES[k]; ok(`shape ${k} has body, tail, two fins and an eye`, s && s.body && s.tail && s.fin && s.fin2 && (s.eye || s.eyes)); });
const shape = { "Bull shark": "shark", "Blacktip shark": "shark", "Bonnethead shark": "shark", "Nurse shark": "shark", "Lemon shark": "shark", "Hammerhead shark": "shark", "Florida gar": "gar", "Longnose gar": "gar", Needlefish: "gar", Stingray: "ray", "Southern stingray": "ray", Pufferfish: "puffer", "Moray eel": "eel", "American eel": "eel" };
Object.keys(shape).forEach(n => ok(`${n} is drawn as a ${shape[n]}`, look(n) && look(n).shape === shape[n]));
ok("older picks are unchanged: flounder stays flat, bowfin and snakehead stay long, cobia stays long", look("Flounder").shape === "flat" && look("Bowfin").shape === "long" && look("Snakehead").shape === "long" && look("Cobia").shape === "long");
ok("gray triggerfish is not caught by the ray rule", look("Gray triggerfish").shape !== "ray");
ok("trout are speckled and peacock bass keep their bars plus a tail eye-spot", look("Spotted seatrout").mark === "speckle" && look("Peacock bass").mark === "bars+ocellus");
ok("marks are read as a list joined with +", /hasMark = m => String\(L\.mark \|\| ""\)\.split\("\+"\)/.test(tankSrc) && /hasMark\("speckle"\)/.test(tankSrc) && /hasMark\("ocellus"\)/.test(tankSrc) && !/L\.mark === /.test(tankSrc));
ok("every look still uses a shape that exists", T.TANK_LOOKS.every(l => T.TANK_SHAPES[l.shape]));
console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
