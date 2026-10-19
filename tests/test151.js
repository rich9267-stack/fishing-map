// Terms page, privacy sentence and the "I agree + 18 or older" box on the access request (Oct 18).
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };

const terms = read("terms.html"), priv = read("privacy.html"), idx = read("index.html"), js = read("js/11-accounts-social.js"), sw = read("sw.js");
ok(/You must be 18 or older to use Fishing Map/.test(terms), "terms: 18 or older");
ok(/Who may join/.test(terms) && /no false catches/.test(terms) && /Your content/.test(terms) && /remove content/.test(terms) && /as it is/i.test(terms) && /State of Florida/.test(terms) && /Changes/.test(terms) && /Contact/.test(terms), "terms cover who may join, fair play, your content, removals, as-is, Florida law, changes, contact");
ok(/Draft\./.test(terms) && /lawyer/.test(terms), "terms say they are a draft not yet reviewed by a lawyer");
ok(!/[w.]+@[w-]+.[a-z]{2,}/i.test(terms), "terms don't publish an email address");
ok(/correcting entries to coins and race results, always with a logged reason/.test(priv) && /Last updated October 18, 2026/.test(priv), "privacy has the correcting-entries sentence and a new date");
ok(/Private spots, and their catches and photos, are visible only to you/.test(priv) && /Messages<\/strong> are visible only to the people in that conversation/.test(priv), "the private-spot and private-message promises are untouched");
ok(/href="terms\.html"/.test(priv) && (idx.match(/terms\.html/g) || []).length >= 3, "Terms is linked next to Privacy");
ok(/id="nm-agree" type="checkbox" required/.test(idx) && /I am 18 or older/.test(idx), "the access request has a required agree + 18 box");
ok(/nm-agree"\)\.checked/.test(js) && /accept_terms/.test(js), "the box is enforced and the acceptance is sent to the database (once setup/89 exists)");
ok(/\.\/terms\.html/.test(sw), "terms.html is in the offline list");
console.log(bad ? "SOME FAILED" : "ALL OK"); process.exit(bad ? 1 : 0);
