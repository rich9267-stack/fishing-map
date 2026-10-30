// test229: v246 — 🪢 knot and 🪝 rig pictures in Learn: each picture is a free one (public domain / CC0 / CC BY, never NC, ND or SA), linked from
// Wikimedia Commons with its source page, licence and credit; cards without a free picture stay text only (picture: null); one shared lnPicture shows them.
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const J = p => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const knots = J("data/learn/knots.json").knots, rigs = J("data/learn/rigs.json").rigs;
const items = knots.concat(rigs), pics = items.filter(i => i.picture);
ok(items.every(i => "picture" in i && !("credit" in i)), "every knot and rig has a picture spot (the old separate credit field is gone)");
ok(["Palomar", "Albright", "Nail knot"].every(n => knots.find(k => k.name === n).picture), "Palomar, Albright and Nail knot have pictures");
ok(["Carolina rig", "Texas rig", "Drop-shot rig"].every(n => rigs.find(r => r.name === n).picture), "Carolina, Texas and Drop-shot rigs have pictures");
ok(items.filter(i => !i.picture).every(i => i.picture === null), "the rest say null (no free picture found, text only)");
ok(pics.every(i => /^https:\/\/upload\.wikimedia\.org\//.test(i.picture.img) && /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(i.picture.page)), "every picture links to Wikimedia Commons (image + source page)");
ok(pics.every(i => /^(Public domain|CC0( \(free to use\))?|CC BY [0-9.]+)$/.test(i.picture.licence)), "every licence is public domain, CC0 or CC BY");
ok(!pics.some(i => /SA|NC|ND/.test(i.picture.licence)), "no ShareAlike, NonCommercial or NoDerivs picture");
ok(pics.every(i => i.picture.credit && i.picture.site === "Wikimedia Commons"), "every picture has a credit and names its site");
const js = fs.readFileSync(path.join(root, "js/62-learn.js"), "utf8");
ok(/lnPicture\(box, k\.picture, .*"Picture", true\)/.test(js) && /lnPicture\(box, r\.picture, .*"Picture", true\)/.test(js), "knot and rig cards use the shared picture box (tall)");
ok(!/learn-fig/.test(js) && !/learn-fig/.test(fs.readFileSync(path.join(root, "css/app.css"), "utf8")), "the old picture box is gone");
ok(/\.learn-fishpic\.tall img \{ max-height: 420px/.test(fs.readFileSync(path.join(root, "css/app.css"), "utf8")), "tall pictures get more room");
ok(/v246/.test(fs.readFileSync(path.join(root, "docs/build_history.md"), "utf8")), "build history has v246");
console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
