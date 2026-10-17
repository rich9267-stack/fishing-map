// 🧭 Screen tutorials + ? help button (v117): js/36-tutorials.js + index.html + css/app.css + setup/73
const fs = require("fs"), path = require("path");
const { JSDOM } = require("jsdom");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const tick = ms => new Promise(r => setTimeout(r, ms || 0));

const APPROVED = {
  home: ["Your spot for today 🏠", "Check tide, wind, and the best spot before you go. Tap the + any time you land one."],
  map: ["Find water 🗺", "Spots, ramps, and parks are all here. Tap the layers button to turn things on and off."],
  play: ["Your fish, swimming 🐠", "Your tank, your best catches, and fish races — all in one place."],
  compete: ["Contests and tournaments 🏆", "Join one, track how you're doing, and see who's winning."],
  community: ["Friends and the feed 👥", "Catches, trips, friends, messages, and groups — tap a tab to switch."],
  stats: ["See how you're doing 📊", "Your top catches, records, and the year so far — all in one place."],
  settings: ["Make it yours ⚙️", "Alerts, privacy, units, offline maps — set them up here, any time."],
  "photo-tip": ["We'll ID it for you 🐟", "Hold the fish flat to measure it, and we'll take a guess at the species too."]
};

function boot(o) {
  o = o || {};
  const dom = new JSDOM(`<html><body>
    <div id="app"></div><div id="welcome" hidden></div><div id="whatsnew" hidden></div><div id="find-page" hidden></div><div id="qc" hidden><div id="qc-id-box"></div></div>
    <button id="tab-list" class="on"></button><button id="tab-map"></button><button id="tab-insights"></button><button id="tab-seasons"></button><button id="tab-tank"></button><button id="tab-feed"></button><button id="tab-compete"></button>
    <div id="me-card" hidden></div><div id="settings-card" hidden></div>
    <button class="tut-help" id="help-btn">?</button><button class="tut-help" id="me-help">?</button>
    <button id="bn-log"></button></body></html>`, { runScripts: "outside-only", url: "https://x.test/", pretendToBeVisual: true });
  const w = dom.window, saved = [];
  w.$ = id => w.document.getElementById(id);
  w.me = o.noMe ? null : { id: "u-rich" };
  if (o.local) w.localStorage.setItem("fm-tut-u-rich", JSON.stringify(o.local));
  w.db = { from: t => ({
    select: () => ({ eq: async () => o.fail ? { data: null, error: { message: "offline" } } : { data: (o.rows || []).map(k => ({ screen_key: k })), error: null } }),
    upsert: async (row, opt) => { saved.push([t, row, opt]); return { error: null }; }
  }) };
  w.eval(read("js/36-tutorials.js") + "\nwindow.T = { TUTS, tutLoadMine, tutMaybe, tutShow, tutPhotoTip, tutCurrentKey, tutPlace, seen: k => tutSeen.has(k), ready: () => tutReady };");
  return { w, saved, card: () => w.document.getElementById("tut"), title: () => { const e = w.document.getElementById("tut-title"); return e ? e.textContent : null; } };
}

(async () => {
  // 1. the words are exactly what Richard approved
  let t = boot();
  const keys = Object.keys(APPROVED);
  ok(Object.keys(t.w.T.TUTS).join() === keys.join(), "8 cards: Home, Map, Play, Compete, Community, Stats, Settings + the photo tip");
  ok(keys.every(k => t.w.T.TUTS[k].title === APPROVED[k][0] && t.w.T.TUTS[k].text.replace(/\*\*/g, "") === APPROVED[k][1]), "every title and line is the approved wording");
  t.w.close();

  // 2. a new person: Home card once, "Got it" remembers it for good
  t = boot();
  await t.w.T.tutLoadMine(); t.w.T.tutMaybe();
  ok(t.card() && t.title() === APPROVED.home[0], "first sign-in shows the Home card");
  ok(t.card().querySelector(".tut-text strong").textContent === "+", "the + is shown in bold");
  ok(t.card().querySelector("#tut-ok").textContent === "Got it", "one 'Got it' button");
  t.card().querySelector("#tut-ok").click(); await tick();
  ok(!t.card(), "'Got it' closes the card");
  ok(t.saved.length === 1 && t.saved[0][0] === "tutorials_seen" && t.saved[0][1].screen_key === "home" && t.saved[0][1].user_id === "u-rich" && t.saved[0][2].ignoreDuplicates === true, "saved to the account as one row (home), duplicates ignored");
  t.w.T.tutMaybe(); ok(!t.card(), "it does not come back on its own");
  ok(JSON.parse(t.w.localStorage.getItem("fm-tut-u-rich")).join() === "home", "also remembered on this phone");

  // 3. opening other tabs shows each tab's card once
  const doc = t.w.document;
  const open = async id => { doc.querySelectorAll(".tabs-x, [id^=tab-]").forEach(b => b.classList.remove("on")); doc.getElementById(id).classList.add("on"); await tick(200); };
  const names = { "tab-map": "map", "tab-tank": "play", "tab-compete": "compete", "tab-feed": "community", "tab-insights": "stats" };
  for (const id of Object.keys(names)) {
    await open(id);
    ok(t.title() === APPROVED[names[id]][0], id + " → its own card");
    t.card().querySelector("#tut-ok").click(); await tick();
  }
  ok(t.saved.map(s => s[1].screen_key).join() === "home,map,play,compete,community,stats", "one saved row per tab");
  await open("tab-map"); ok(!t.card(), "going back to a seen tab shows nothing");
  await open("tab-seasons"); ok(!t.card(), "Seasons is part of Stats, already seen");

  // 4. the ? button replays the card for the screen you are on, without saving anything new
  const before = t.saved.length;
  doc.getElementById("help-btn").click(); await tick();
  ok(t.title() === APPROVED.stats[0], "? on Stats brings back the Stats card (Seasons page)");
  t.card().querySelector("#tut-ok").click(); await tick();
  ok(!t.card() && t.saved.length === before, "closing a replay saves nothing more");
  await open("tab-map"); doc.getElementById("help-btn").click(); await tick();
  ok(t.title() === APPROVED.map[0], "? on Map brings back the Map card");
  doc.getElementById("help-btn").click(); await tick();
  ok(!t.card(), "tapping ? again closes it");
  t.w.document.dispatchEvent(new t.w.KeyboardEvent("keydown", { key: "Escape" })); // nothing open: no error

  // 5. Me page = the Settings card, with its own ? in the page header
  doc.getElementById("me-card").hidden = false; await tick(200);
  ok(t.w.T.tutCurrentKey() === "settings" && t.title() === APPROVED.settings[0], "Me page opens the Settings card");
  doc.getElementById("me-help").click(); await tick();
  ok(!t.card(), "the ? inside the Me page works (closes the open card)");
  doc.getElementById("me-help").click(); await tick();
  ok(t.title() === APPROVED.settings[0], "and brings it back");
  t.card().querySelector("#tut-ok").click(); await tick();
  ok(t.saved.some(s => s[1].screen_key === "settings"), "Settings card saved as seen");
  t.w.close();

  // 6. the post-photo tip: once, never at the tap of +
  t = boot();
  await t.w.T.tutLoadMine();
  t.w.T.tutPhotoTip(); await tick(500);
  ok(t.title() === APPROVED["photo-tip"][0], "first photo → the fish ID + measuring tip");
  t.card().querySelector("#tut-ok").click(); await tick();
  ok(t.saved.length === 1 && t.saved[0][1].screen_key === "photo-tip", "saved as seen");
  t.w.T.tutPhotoTip(); await tick(500);
  ok(!t.card(), "second photo → no tip");
  t.w.close();

  // 7. a second phone: the account already knows what was seen
  t = boot({ rows: ["home", "map", "photo-tip"] });
  await t.w.T.tutLoadMine(); t.w.T.tutMaybe();
  ok(!t.card() && t.saved.length === 0, "new phone, same account: Home card does not repeat");
  t.w.T.tutPhotoTip(); await tick(500);
  ok(!t.card(), "nor does the photo tip");
  t.w.document.getElementById("tab-map").classList.add("on"); t.w.document.getElementById("tab-list").classList.remove("on"); await tick(200);
  ok(!t.card(), "nor Map");
  t.w.document.getElementById("tab-map").classList.remove("on"); t.w.document.getElementById("tab-tank").classList.add("on"); await tick(200);
  ok(t.title() === APPROVED.play[0], "but Play (never seen) does show");
  t.w.close();

  // 8. offline / not signed in / other pop-ups
  t = boot({ fail: true });
  await t.w.T.tutLoadMine(); t.w.T.tutMaybe();
  ok(!t.card() && !t.w.T.ready(), "can't reach the account and nothing remembered here: no card (never nag a brand-new phone)");
  t.w.document.getElementById("help-btn").click(); await tick();
  ok(t.title() === APPROVED.home[0], "…but ? still works");
  t.w.close();
  t = boot({ fail: true, local: ["home"] });
  await t.w.T.tutLoadMine(); t.w.T.tutMaybe();
  ok(!t.card() && t.w.T.ready(), "offline with this phone's memory: Home stays seen");
  t.w.close();
  t = boot({ local: ["home", "map"] });
  await t.w.T.tutLoadMine();
  ok(t.saved.map(s => s[1].screen_key).sort().join() === "home,map", "cards seen offline are saved to the account at the next sign-in");
  t.w.close();
  t = boot({ noMe: true });
  t.w.T.tutMaybe(); ok(!t.card(), "signed out: nothing shows");
  t.w.close();
  t = boot();
  await t.w.T.tutLoadMine();
  const ask = t.w.document.createElement("div"); ask.className = "ask-bg"; t.w.document.body.appendChild(ask);
  t.w.T.tutMaybe(); ok(!t.card(), "never stacks on another pop-up");
  ask.remove();
  t.w.document.getElementById("whatsnew").hidden = false; t.w.T.tutMaybe(); ok(!t.card(), "waits while 'What's new' is open");
  t.w.document.getElementById("whatsnew").hidden = true; t.w.document.getElementById("qc").hidden = false;
  t.w.T.tutMaybe(); ok(!t.card(), "no tab card over the camera");
  t.w.close();

  // 9. the arrow points at the thing to tap
  t = boot();
  await t.w.T.tutLoadMine();
  const rect = (el, top, h) => { el.getBoundingClientRect = () => ({ top, bottom: top + h, left: 150, right: 210, width: 60, height: h }); };
  rect(t.w.document.getElementById("bn-log"), 650, 50);
  t.w.T.tutShow("home"); await tick(50); t.w.T.tutPlace();
  ok(t.card().querySelector(".tut-card").classList.contains("down") || t.card().firstChild.classList.contains("down"), "target low on the screen → card above it, arrow down");
  t.card().querySelector("#tut-ok").click();
  rect(t.w.document.getElementById("bn-log"), 100, 50);
  t.w.T.tutShow("home"); await tick(50); t.w.T.tutPlace();
  ok(t.card().firstChild.classList.contains("up"), "target high on the screen → card below it, arrow up");
  t.card().querySelector("#tut-ok").click();
  t.w.T.tutShow("compete"); await tick(50); t.w.T.tutPlace();
  ok(t.card().firstChild.classList.contains("center"), "target not on screen → card centred, no arrow");
  t.w.close();

  // 10. the pieces are wired into the page
  const html = read("index.html"), sw = read("sw.js"), runall = read("tests/run-all.sh"), sql = read("setup/73-tutorials-seen.sql");
  ok(/id="help-btn"[^>]*>\?<\/button>\s*<button class="linkbtn" id="me-btn"/.test(html.replace(/\n\s*/g, " ").replace(/> </g, ">\n<").replace(/\n/g, " ")) || html.indexOf('id="help-btn"') < html.indexOf('id="me-btn"'), "? button sits right next to the Me picture");
  ok(html.indexOf('id="help-btn"') > 0 && html.indexOf('id="me-help"') > 0 && html.indexOf('id="settings-help"') > 0, "? button on the top bar, the Me page and the Settings page");
  ok(/js\/35-palettes\.js[^\n]*\n<script src="js\/36-tutorials\.js\?v=\d+"><\/script>\n(<script src="js\/3[7-9]-[^\n]*\n)*<script src="js\/99-boot/.test(html), "script is loaded before the boot file");
  ok(sw.includes('"./js/36-tutorials.js"'), "works offline (in the service worker list)");
  ok(read("js/11-accounts-social.js").includes("tutLoadMine()"), "sign-in loads what this person has seen");
  ok((read("js/06-catching.js").match(/tutPhotoTip\(\)/g) || []).length === 2, "photo tip hooked into Quick catch and the full catch form");
  ok(runall.includes("test129.js"), "this test is in run-all.sh");
  const dbKeys = (/screen_key in \(([^)]*)\)/.exec(sql)[1].match(/'[a-z-]+'/g) || []).map(s => s.slice(1, -1));
  ok(dbKeys.join() === keys.join(), "the database accepts exactly these 8 keys");
  ok(/references auth\.users\(id\) on delete cascade/.test(sql) && /for select using \(public\.is_member\(\) and user_id = auth\.uid\(\)\)/.test(sql) && !/for update|for delete/.test(sql), "own rows only; deleted with the account; no update/delete rights");
  const targets = keys.map(k => t.w.T.TUTS[k].target); // (read before close) selectors name real ids
  const live = [...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]).concat([...read("js/26-sub-tabs.js").matchAll(/"sub-tabs/g)].length ? ["__sub"] : []);
  ok(["bn-log", "map-layers-btn", "play-sw", "ct-body", "com-sw", "me-card", "qc-id-box"].every(i => live.includes(i)), "every arrow target exists in the page");
  ok(!/\bfetch\(|XMLHttpRequest|https?:\/\//.test(read("js/36-tutorials.js").replace(/\/\/.*$/gm, "")), "no new outside server (the security policy stays as it is)");

  console.log(bad ? "\nSOME FAILED" : "\nALL OK"); process.exit(bad ? 1 : 0);
})();
