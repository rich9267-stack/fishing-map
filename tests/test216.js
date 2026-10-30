// test216: 🖼 Learn fish illustrations data check: every fish card has a free illustration or is listed as "none", each picture has https links, a source page,
// an allowed licence (public domain / CC0 / CC BY only) and a credit, and no banned source is used.
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const J = p => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const fish = J("data/learn/fish.json").fish.map(f => f.name), P = J("data/learn/fish-pictures.json"), pics = P.pictures, none = P.none;
const missing = fish.filter(n => !pics[n] && !none.includes(n));
ok(!missing.length, "every fish card has a picture or is listed as none" + (missing.length ? ": " + missing.join(", ") : ""));
ok(Object.keys(pics).every(n => fish.includes(n)) && none.every(n => fish.includes(n)), "every picture / none name is a fish card");
ok(!none.some(n => pics[n]), "no fish is both pictured and listed as none (" + Object.keys(pics).length + " pictured, " + none.length + " none)");
const all = Object.entries(pics);
ok(all.every(([, p]) => /^https:\/\/(upload\.wikimedia\.org\/wikipedia\/commons\/|inaturalist-open-data\.s3\.amazonaws\.com\/photos\/)/.test(p.img)), "every picture is linked from Wikimedia Commons or iNaturalist over https");
ok(all.every(([, p]) => /^https:\/\/(commons\.wikimedia\.org\/wiki\/File:|www\.inaturalist\.org\/photos\/)/.test(p.page)), "every picture has its source page");
ok(all.every(([, p]) => /^(Public domain \(U\.S\. government work\)|Public domain \(old illustration\)|CC0 \(no rights reserved\)|CC BY( \d\.\d)?)$/.test(p.licence)), "every licence is public domain, CC0 or CC BY (no NC / ND / SA)");
ok(all.every(([, p]) => p.credit && p.credit.length >= 3 && p.site), "every picture has a credit and a site name");
ok(!/tomelleri|peebles|fishbase|myfwc|google/i.test(JSON.stringify(pics)), "no Tomelleri, Peebles/FWC, FishBase or Google source");
const js = fs.readFileSync(path.join(root, "js/62-learn.js"), "utf8");
ok(/word \+ ": " \+ p\.credit \+ " · " \+ p\.licence/.test(js) && /lnFishPicture = \(box, f\) => lnPicture\(.*"Illustration"\)/.test(js) && /lnFishPicture\(box, f\)/.test(js), "the fish card shows the credit and licence under the picture");
ok(/fish-pictures/.test(fs.readFileSync(path.join(root, "sw.js"), "utf8")), "the phone keeps a copy of the picture list (sw.js)");
console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
