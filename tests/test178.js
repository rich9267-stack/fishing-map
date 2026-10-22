// test178: 🧠 Fish ID step 3 (js/57, setup/104): flag photos "wrong fish"/"can't tell", merge name spellings (counts only), counts after flags
const fs = require("fs");
const { JSDOM } = require("jsdom");
const read = f => fs.readFileSync(__dirname + "/../" + f, "utf8");
let bad = 0; const ok = (n, c) => { console.log((c ? "ok   " : "FAIL ") + n); if (!c) bad++; };

// fake page + fake Supabase (owner functions + signed links); the fake stores flags/merges like setup/104 does
const dom = new JSDOM(`<div data-asec="fishid"><div id="fishid-admin"></div></div>`);
const document = dom.window.document;
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
const rows = [];
const add = (sp, n, pre) => { for (let i = 0; i < n; i++) rows.push({ catch_id: (pre || sp) + i, species: sp, path: `u1/${(pre || sp).replace(/\s/g, "")}-${i}.jpg` }); };
add("Snook", 31); add("snok", 4); add("Redfish", 30); add("Red fish", 3, "RF");
const store = { flags: { "Redfish0": "wrong" }, names: {} }, calls = [];
let failSave = false;
const db = {
  rpc: async (n, a) => {
    calls.push({ n, a });
    if (n === "fishid_training_members") return { data: 2, error: null };
    if (n === "fishid_training_list") return { data: rows, error: null };
    if (n === "fishid_training_marks") return { data: { flags: Object.entries(store.flags).map(([catch_id, flag]) => ({ catch_id, flag })), names: Object.entries(store.names).map(([from_name, to_name]) => ({ from_name, to_name })) }, error: null };
    if (failSave) return { data: null, error: { message: "network" } };
    if (n === "fishid_training_set_flag") { if (a.p_flag) store.flags[a.p_catch] = a.p_flag; else delete store.flags[a.p_catch]; return { data: null, error: null }; }
    if (n === "fishid_training_set_name") { const k = a.p_from.trim().toLowerCase(); if (a.p_to) store.names[k] = a.p_to.trim(); else delete store.names[k]; return { data: null, error: null }; }
    return { error: { message: "no " + n } };
  },
  storage: { from: () => ({ createSignedUrls: async paths => ({ data: paths.map(p => ({ path: p, signedUrl: "https://x/" + p })), error: null }) }) }
};
let toasts = [];
const F = new Function("document", "window", "el", "db", "me", "toast", read("js/57-fishid-review.js") + "; return { adminFishIdLoad, firGroup, firResolve };")
  (document, dom.window, el, db, { id: "u-rich", isOwner: true }, t => toasts.push(t));
dom.window.HTMLElement.prototype.scrollIntoView = function () {};
const box = () => document.getElementById("fishid-admin");
const tick = () => new Promise(r => setTimeout(r, 10));
const table = () => [...box().querySelectorAll("table tr")].slice(1).map(tr => [...tr.children].map(td => td.textContent));
const btn = (row, label) => [...box().querySelectorAll("table tr")][row + 1].querySelector(`button[aria-label^="${label}"]`);

(async () => {
  // pure grouping
  ok("merge follows the owner's names, any capitals", F.firResolve(" SNOK ", { snok: "Snook" }).name === "Snook" && F.firResolve("Snook", { snook: "Snook" }).key === "snook");
  ok("a merge loop can't hang", F.firResolve("a", { a: "B", b: "A" }).key.length === 1);
  const g = F.firGroup(rows, { snok: "Snook" }, { Snook0: "unsure", Snook1: "wrong" });
  const sn = g.find(x => x.key === "snook");
  ok("merged spelling counts with the fish; flagged photos left out of 'after flags'", sn.n === 35 && sn.ok === 33 && sn.name === "Snook" && sn.spellings === 2);
  ok("pure case merge fixes the shown name", F.firGroup([{ catch_id: 1, species: "snook", path: "a" }, { catch_id: 2, species: "snook", path: "b" }, { catch_id: 3, species: "Snook", path: "c" }], { snook: "Snook" }, {})[0].name === "Snook");

  await F.adminFishIdLoad();
  let t = box().textContent;
  ok("summary shows photos and the count after flags", /2 members opted in/.test(t) && /68 photos \(67 after flags\)/.test(t) && /4 fish/.test(t));
  let tr = table();
  ok("table has Photos and After flags columns; existing flag counted", tr.find(r => r[0] === "Redfish").slice(1, 3).join("|") === "30|29 ⚠️");
  ok("under-30 warning uses counts after flags", /fewer than 30 photos after flags/.test(t) && /Redfish/.test(t.split("after flags (too few to train on)")[1] || ""));
  ok("flag count line", /1 catch flagged and left out of training/.test(t));

  // (1) flag in Preview
  btn(0, "Preview 12").click(); await tick();
  ok("Snook is first (31 photos, none flagged)", table()[0][0] === "Snook");
  const cards = [...box().querySelectorAll(".fir-card")];
  ok("Preview shows 12 photos, each with ✅ ❌ ❓ buttons", cards.length === 12 && cards.every(c => c.querySelectorAll("button").length === 3));
  const cid = cards[0].dataset.catch;
  cards[0].querySelector('button[data-flag="wrong"]').click(); await tick();
  ok("❌ saves only catch id + 'wrong'", calls.some(c => c.n === "fishid_training_set_flag" && c.a.p_catch === cid && c.a.p_flag === "wrong" && Object.keys(c.a).length === 2) && store.flags[cid] === "wrong");
  ok("the card shows it's flagged", cards[0].classList.contains("fir-flagged") && /Wrong fish/.test(cards[0].textContent));
  tr = table();
  ok("Snook after flags drops to 30, photo count stays 31", tr.find(r => r[0] === "Snook").slice(1, 3).join("|") === "31|30");
  cards[0].querySelector('button[data-flag="unsure"]').click(); await tick();
  ok("❓ changes it to can't tell", store.flags[cid] === "unsure" && /Can't tell/.test(cards[0].textContent));
  cards[0].querySelector('button[data-flag=""]').click(); await tick();
  ok("✅ takes the flag off and the count goes back", !store.flags[cid] && !cards[0].classList.contains("fir-flagged") && table().find(r => r[0] === "Snook")[2] === "31");
  cards[1].querySelector('button[data-flag="wrong"]').click(); await tick();
  btn(0, "Preview 12").click(); await tick();
  ok("a new Preview leaves flagged photos out", ![...box().querySelectorAll(".fir-card")].some(c => c.dataset.catch === cards[1].dataset.catch));
  const seeFlagged = [...box().querySelectorAll(".fir-preview button")].find(b => /See the 1 flagged/.test(b.textContent));
  ok("'See the 1 flagged' button", !!seeFlagged);
  seeFlagged.click(); await tick();
  ok("…shows the flagged photo so it can be put back", box().querySelectorAll(".fir-card").length === 1 && box().querySelector(".fir-card").classList.contains("fir-flagged"));
  failSave = true; box().querySelector('.fir-card button[data-flag=""]').click(); await tick(); failSave = false;
  ok("a failed save says so and changes nothing", toasts.some(x => /Couldn't save/.test(x)) && store.flags[cards[1].dataset.catch] === "wrong");

  // (2) merge
  const snokRow = table().findIndex(r => r[0] === "snok");
  btn(snokRow, "Count snok").click(); await tick();
  const form = box().querySelector(".fir-preview");
  ok("Merge form explains members' catches keep their name, suggests other fish", /keep the name they typed/.test(form.textContent) && [...form.querySelectorAll("datalist option")].map(o => o.value).includes("Snook"));
  form.querySelector("input").value = "Snook";
  [...form.querySelectorAll("button")].find(b => b.textContent === "Save").click(); await tick();
  ok("merge saves only the two names", calls.some(c => c.n === "fishid_training_set_name" && c.a.p_from === "snok" && c.a.p_to === "Snook") && store.names.snok === "Snook");
  tr = table();
  ok("after merge: snok gone, Snook 35 photos (34 after flags)", !tr.some(r => r[0] === "snok") && tr.find(r => r[0] === "Snook").slice(1, 3).join("|") === "35|34");
  ok("merged names listed with Undo", /"snok" counts as "Snook"/.test(box().textContent));
  const undo = [...box().querySelectorAll(".fir-merge button")][0]; undo.click(); await tick();
  ok("Undo removes the merge", !store.names.snok && table().some(r => r[0] === "snok") && !box().querySelector(".fir-merge"));

  // reload keeps flags and merges (from the database, not the phone)
  store.names["red fish"] = "Redfish"; await F.adminFishIdLoad();
  ok("reload: flags and merges come back from the database", table().find(r => r[0] === "Redfish").slice(1, 3).join("|") === "33|32" && /2 catches flagged/.test(box().textContent));

  // no members' catches touched, nothing copied/exported
  ok("never writes to catches/photos or storage", !calls.some(c => /catch|photo/.test(c.n) && !/fishid_/.test(c.n)));
  const js = read("js/57-fishid-review.js").replace(/\/\/.*$/gm, "");
  ok("js/57: no download/export/upload, no table writes", !/download|createObjectURL|export|\.(upload|copy|move)\(|\.from\("(catches|photos)"\)\.(update|insert|delete|upsert)/i.test(js));
  const sql = read("setup/104-fishid-training-flags.sql").replace(/--.*$/gm, "");
  ok("SQL: owner-only functions, no anon/public grants, tables locked, only catch id + flag stored, cascade on delete",
    (sql.match(/if not public\.is_owner\(\) then raise exception 'Owner only\.'/g) || []).length === 3
    && ["fishid_training_marks()", "fishid_training_set_flag(uuid, text)", "fishid_training_set_name(text, text)"].every(f => sql.includes(`revoke all on function public.${f} from anon, public;`))
    && /revoke all on public\.fishid_training_flags from anon, authenticated, public/.test(sql) && /revoke all on public\.fishid_training_names from anon, authenticated, public/.test(sql)
    && !/create policy/.test(sql) && !/path|bytea|storage\./i.test(sql.split("create table if not exists public.fishid_training_names")[0])
    && /references public\.catches\(id\) on delete cascade/.test(sql) && !/update public\.catches/.test(sql));
  ok("terms.html and privacy.html not touched by step 3", !/fishid_training_flags|Wrong fish|Can't tell/.test(read("terms.html") + read("privacy.html")));

  console.log(bad ? `test178 FAILED (${bad})` : "test178 OK");
  process.exit(bad ? 1 : 0);
})();
