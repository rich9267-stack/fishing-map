// test183: 🧠 Fish ID step 4 (js/57): "Ready to train?" summary + plans/fishid-model-plan.md (plan only, no training, no copying)
const fs = require("fs");
const { JSDOM } = require("jsdom");
const read = f => fs.readFileSync(__dirname + "/../" + f, "utf8");
let bad = 0; const ok = (n, c) => { console.log((c ? "ok   " : "FAIL ") + n); if (!c) bad++; };

const dom = new JSDOM(`<div data-asec="fishid"><div id="fishid-admin"></div></div>`);
const document = dom.window.document;
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
let rows = [];
const add = (sp, n, pre) => { for (let i = 0; i < n; i++) rows.push({ catch_id: (pre || sp) + i, species: sp, path: `u1/${(pre || sp).replace(/\s/g, "")}-${i}.jpg` }); };
add("Snook", 32); add("Redfish", 31); add("Tarpon", 12); add("Mangrove snapper", 25);
rows.push({ catch_id: "Snook0", species: "Snook", path: "u1/Snook-0b.jpg" });   // a catch with 2 photos
let store = { flags: { Snook0: "wrong", Redfish0: "unsure", Redfish1: "unsure" }, names: {} };
const calls = [];
const db = {
  rpc: async (n, a) => {
    calls.push(n);
    if (n === "fishid_training_members") return { data: 4, error: null };
    if (n === "fishid_training_list") return { data: rows, error: null };
    if (n === "fishid_training_marks") return { data: { flags: Object.entries(store.flags).map(([catch_id, flag]) => ({ catch_id, flag })), names: Object.entries(store.names).map(([from_name, to_name]) => ({ from_name, to_name })) }, error: null };
    if (n === "fishid_training_set_flag") { if (a.p_flag) store.flags[a.p_catch] = a.p_flag; else delete store.flags[a.p_catch]; return { data: null, error: null }; }
    return { error: { message: "no " + n } };
  },
  storage: { from: () => ({ createSignedUrls: async paths => ({ data: paths.map(p => ({ path: p, signedUrl: "https://x/" + p })), error: null }) }) }
};
const F = new Function("document", "window", "el", "db", "me", "toast", read("js/57-fishid-review.js") + "; return { adminFishIdLoad };")
  (document, dom.window, el, db, { id: "u-rich", isOwner: true }, () => {});
dom.window.HTMLElement.prototype.scrollIntoView = function () {};
const box = () => document.getElementById("fishid-admin");
const ready = () => box().querySelector(".fir-ready");
const tick = () => new Promise(r => setTimeout(r, 10));

(async () => {
  await F.adminFishIdLoad();
  let t = ready() ? ready().textContent : "";
  ok("Ready to train? box shown on the tab", /Ready to train\?/.test(t));
  ok("fish with 30+ photos after flags named with their counts", /2 of 4 fish have 30\+ photos after flags: Snook \(31\), Redfish \(29\)/.test(t) === false && /✅ 1 of 4 fish have 30\+ photos after flags: Snook \(31\)\./.test(t));
  ok("flagged PHOTOS counted (a flagged catch with 2 photos = 2), split by wrong / can't tell", /🚩 4 photos flagged \(2 wrong fish, 2 can't tell\)/.test(t));
  ok("fish needing more photos, closest first, with how many more", /📸 Need more photos: Redfish \(1 more\), Mangrove snapper \(5 more\), Tarpon \(18 more\)\./.test(t));
  ok("verdict: not yet with only 1 fish ready", /Not yet — a first try needs at least 2 fish with 30\+ photos each; 1 so far\./.test(t));

  // un-flag one Redfish photo in Preview → Redfish reaches 30 → verdict turns Yes, without reloading
  const redRow = [...box().querySelectorAll("table tr")].findIndex(tr => tr.firstChild.textContent === "Redfish");
  [...box().querySelectorAll("table tr")][redRow].querySelector('button[aria-label^="Preview 12"]').click(); await tick();
  const seeFlagged = [...box().querySelectorAll(".fir-preview button")].find(b => /See the 2 flagged/.test(b.textContent));
  seeFlagged.click(); await tick();
  box().querySelector('.fir-card button[data-flag=""]').click(); await tick();
  t = ready().textContent;
  ok("after ✅ un-flag the summary updates: Redfish ready, Yes verdict", /Yes — 2 fish have enough photos for a first try\. \(Training itself waits for the lawyer review\.\)/.test(t) && /Redfish \(30\)/.test(t) && /🚩 3 photos flagged \(2 wrong fish, 1 can't tell\)/.test(t) && !/Redfish \(\d+ more\)/.test(t));

  store = { flags: {}, names: {} }; rows = []; add("Snook", 40); add("Redfish", 30);
  await F.adminFishIdLoad(); t = ready().textContent;
  ok("all fish ready: no 'need more' line, 0 flagged", /🚩 0 photos flagged\./.test(t) && !/Need more photos/.test(t) && /2 of 2 fish/.test(t));

  ok("no new database calls for step 4 (only the existing owner functions)", calls.every(n => ["fishid_training_members", "fishid_training_list", "fishid_training_marks", "fishid_training_set_flag"].includes(n)));
  const js = read("js/57-fishid-review.js").replace(/\/\/.*$/gm, "");
  ok("js/57: still no download/export/upload/copy", !/download|createObjectURL|export|\.(upload|copy|move)\(/i.test(js));

  // the plan document
  const plan = read("plans/fishid-model-plan.md");
  ok("plan: $0 options with what each needs", /\$0/.test(plan) && /## Free ways to train/.test(plan) && (plan.match(/^### Option/gm) || []).length >= 3 && /What it needs/.test(plan));
  ok("plan: lawyer questions incl. copying photos and deletion after training", /## Questions for the lawyer review/.test(plan) && /cop(y|ies|ying)/i.test(plan.split("## Questions for the lawyer review")[1]) && /delet/i.test(plan.split("## Questions for the lawyer review")[1]) && /trained model/i.test(plan.split("## Questions for the lawyer review")[1]));
  ok("plan: nothing is trained or copied until after the review", /Nothing is trained or copied until/.test(plan));
  ok("terms.html and privacy.html not touched by step 4", !/Ready to train|fishid-model-plan/.test(read("terms.html") + read("privacy.html")));

  console.log(bad ? `test183 FAILED (${bad})` : "test183 OK");
  process.exit(bad ? 1 : 0);
})();
