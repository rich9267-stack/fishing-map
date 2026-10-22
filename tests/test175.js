// test175: 🧠 Fish ID training review (js/57, setup/101): owner-only Admin section, counts, per-fish table biggest first, under-30 warning, Preview 12
const fs = require("fs");
const { JSDOM } = require("jsdom");
const read = f => fs.readFileSync(__dirname + "/../" + f, "utf8");
let bad = 0; const ok = (n, c) => { console.log((c ? "ok   " : "FAIL ") + n); if (!c) bad++; };

// fake page + fake Supabase (the two owner functions + signed links)
const dom = new JSDOM(`<div id="invite-card"><div id="admin-nav"></div><div data-asec="people"></div><div data-asec="fishid"><div id="fishid-admin"></div></div></div><button id="invite-btn"></button>`);
const document = dom.window.document;
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
const rows = [];
const add = (sp, n) => { for (let i = 0; i < n; i++) rows.push({ catch_id: sp + i, species: sp, path: `u1/${sp.replace(/\s/g, "")}-${i}.jpg` }); };
add("Snook", 40); add("snook ", 2); add("Redfish", 31); add("Mangrove snapper", 5); rows.push({ catch_id: "x", species: "  ", path: "u1/blank.jpg" });
let signed = [], fail = null;
const db = {
  rpc: async n => fail ? { data: null, error: { message: fail } } : n === "fishid_training_members" ? { data: 3, error: null } : n === "fishid_training_list" ? { data: rows, error: null } : { error: { message: "no " + n } },
  storage: { from: b => ({ createSignedUrls: async (paths, sec) => { signed.push({ b, paths, sec }); return { data: paths.map(p => ({ path: p, signedUrl: p === "u1/Snook-0.jpg" ? null : "https://x/" + p })), error: null }; } }) }
};
const mk = me => new Function("document", "window", "el", "db", "me", read("js/38-admin-powers.js") + "\n" + read("js/57-fishid-review.js") + "\n" + read("js/40-admin-page.js") + "; return { adminFishIdLoad, firGroup, adminPageShow };")
  (document, dom.window, el, db, me);
const box = () => document.getElementById("fishid-admin");
dom.window.HTMLElement.prototype.scrollIntoView = function () {};

(async () => {
  const OWNER = mk({ id: "u-rich", isAdmin: true, isOwner: true, powers: [] });
  const g = OWNER.firGroup(rows);
  ok("grouping: same fish any capitals/spaces together, blank names dropped, biggest first", g.length === 3 && g[0].name === "Snook" && g[0].n === 42 && g[0].spellings === 2 && g[1].name === "Redfish" && g[2].n === 5);

  OWNER.adminPageShow("people");
  const tabs = [...document.querySelectorAll("#admin-nav button")].map(b => b.dataset.asec);
  ok("Owner sees the 🧠 Fish ID tab", tabs.includes("fishid"));
  const ADMIN = mk({ id: "a1", isAdmin: true, isOwner: false, powers: ["people", "reports", "dashboard", "read_log", "manage_admins"] });
  ADMIN.adminPageShow("fishid");
  ok("an admin with every normal box does NOT get the Fish ID tab", ![...document.querySelectorAll("#admin-nav button")].some(b => b.dataset.asec === "fishid"));
  await ADMIN.adminFishIdLoad();
  ok("and the loader shows nothing for an admin", box().textContent === "");

  OWNER.adminPageShow("fishid"); await new Promise(r => setTimeout(r, 0)); await OWNER.adminFishIdLoad();
  const t = box().textContent;
  ok("summary: members, photos, fish", /3 members opted in/.test(t) && /78 photos/.test(t) && /3 fish/.test(t));
  ok("plain words: never Private, nothing is copied", /Never Private/.test(t) && /Nothing is copied/.test(t));
  ok("fish under 30 named as too few", /1 of 3 fish have fewer than 30 photos \(too few to train on\): Mangrove snapper\./.test(t));
  const trs = [...box().querySelectorAll("table tr")].slice(1).map(tr => [...tr.children].map(td => td.textContent));
  ok("table: biggest first, warning mark on the small one", trs.length === 3 && trs[0][0] === "Snook" && trs[0][1] === "42" && trs[1][1] === "31" && trs[2][1] === "5 ⚠️");

  [...box().querySelectorAll("table button")][0].click(); await new Promise(r => setTimeout(r, 10));
  const s = signed[signed.length - 1];
  ok("Preview 12 asks for 12 different Snook photos from the photos bucket, short-lived links", s.b === "photos" && s.paths.length === 12 && new Set(s.paths).size === 12 && s.paths.every(p => /Snook|snook/i.test(p)) && s.sec <= 3600);
  const imgs = box().querySelectorAll(".fir-preview img"), missing = s.paths.includes("u1/Snook-0.jpg") ? 1 : 0;
  ok("shows the photos it could open, says how many couldn't", imgs.length === 12 - missing && (missing ? /1 couldn't be opened/.test(box().textContent) : true) && /saved as "Snook"/.test(box().textContent));
  ok("mentions when a name was typed different ways", /typed 2 different ways/.test(box().textContent));
  [...box().querySelectorAll("table button")][2].click(); await new Promise(r => setTimeout(r, 10));
  ok("a fish with only 5 photos previews all 5", signed[signed.length - 1].paths.length === 5);

  fail = "network"; await OWNER.adminFishIdLoad(); fail = null;
  ok("a failed load says so in plain words", /Couldn't load it/.test(box().textContent));

  // no export / download anywhere in the new code; wiring
  const js = read("js/57-fishid-review.js").replace(/\/\/.*$/gm, "");
  ok("no download/export in js/57", !/download|createObjectURL|\.download\b|export|\.from\("[^"]+"\)\.(upload|copy|move)/i.test(js));
  const html = read("index.html");
  ok("js/57 loaded by the page and kept offline, section box present", /<script src="js\/57-fishid-review\.js\?v=\d+"><\/script>/.test(html) && read("sw.js").includes('"./js/57-fishid-review.js"') && /data-asec="fishid"><div id="fishid-admin">/.test(html));
  const sql = read("setup/101-fishid-training-review.sql").replace(/--.*$/gm, "");
  ok("SQL: owner-only, no anon/public grants, view-only storage rule, never Private", /is_owner\(\)/.test(sql) && /revoke all on function public\.fishid_training_members\(\) from anon, public/.test(sql) && /revoke all on function public\.fishid_training_has_path\(text\) from anon, public/.test(sql) && /on storage\.objects for select to authenticated/.test(sql) && !/for (insert|update|delete|all)/.test(sql) && /in \('friends', 'public'\)/.test(sql) && !/'private'/.test(sql));
  ok("terms.html and privacy.html not touched by step 2 (no review-screen wording)", !/fishid_training_has_path|Preview 12/.test(read("terms.html") + read("privacy.html")));

  console.log(bad ? `test175 FAILED (${bad})` : "test175 OK");
  process.exit(bad ? 1 : 0);
})();
