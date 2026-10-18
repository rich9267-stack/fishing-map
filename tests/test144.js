// Admin controls step 5: bring-back (Removed section) and safer bans (setup/82, js/42-admin-undo.js).
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };

const sql = read("setup/82-undo-and-bans.sql");
ok(/ban_user\(p_user uuid, p_reason text\)/.test(sql) && /length\(p_reason\) < 5/.test(sql) && /has_power\('ban'\)/.test(sql), "ban needs the Ban box and a reason of at least 5 letters");
ok(/drop function if exists public\.ban_user\(uuid\)/.test(sql), "the old one-argument ban is gone");
ok(/reason: /.test(sql) && /app\.ban_reason/.test(sql), "the reason goes in the admin log line");
ok(/restore_content[\s\S]*has_power\('reports'\)/.test(sql) && /restore_host_page[\s\S]*has_power\('pages'\)/.test(sql), "bring-back needs the matching boxes");
ok(/content_restored/.test(sql) && /spot_restored/.test(sql) && /\(was /.test(sql), "bring-backs are logged; closed pages remember their old status");
ok(/removed_items[\s\S]*has_power\('delete_spot'\)/.test(sql) && !/lat|lng/i.test(sql.replace(/--.*$/gm, "")), "Removed list is limited by box and carries no coordinates");

const js = read("js/42-admin-undo.js");
const calls = [], answers = { reason: "Posting spam", ok: true };
const nodes = [];
function el(t, c, txt) { const e = { t, c, text: txt || "", kids: [], dataset: {}, style: {}, appendChild(k) { this.kids.push(k); return k; }, addEventListener(ev, f) { this[ev] = f; }, setAttribute() {}, remove() {}, focus() {} }; return e; }
const msgs = [];
const box = el("div");
const ctx = {
  adminCan: () => true, el, alert: m => msgs.push(m), window: {}, loadSpots: async () => calls.push("loadSpots"),
  askOk: async t => { calls.push("confirm:" + t); return answers.ok; },
  document: { activeElement: null, body: { appendChild: n => nodes.push(n) }, createElement: t => el(t), getElementById: id => id === "removed-admin" ? box : null },
  db: { rpc: async (n, a) => { calls.push([n, a]); if (n === "removed_items") return { data: [
    { kind: "catch", id: "c1", label: "snook catch", who: "Tess", removed_at: "2026-10-18T12:00:00Z", removed_by: "rich9267@gmail.com" },
    { kind: "spot", id: "s1", label: "Old dock", who: "Bo", removed_at: "2026-10-18T12:00:00Z", removed_by: "rich9267@gmail.com" },
    { kind: "page", id: "p1", label: "Club", who: "Bo", removed_at: "2026-10-18T12:00:00Z", removed_by: "rich9267@gmail.com" }] }; return {}; } }
};
vm.createContext(ctx); vm.runInContext(js + "\nthis.out = { askReason, adminBan, adminUndoLoad };", ctx);
(async () => {
  // ban: first the reason box, then the second confirm, then the call
  const p = ctx.out.adminBan("u1", "Tess");
  await new Promise(r => setTimeout(r, 0));
  const bg = nodes[0], dlg = bg.kids[0];
  const ta = dlg.kids.find(k => k.t === "textarea"), row = dlg.kids.find(k => k.c === "ask-btns"), err = dlg.kids.find(k => k.c === "msg err");
  const yes = row.kids[1]; ta.value = "bad"; yes.click();
  ok(/at least/.test(err.textContent), "a too-short reason is refused in the box");
  ta.value = answers.reason; yes.click();
  const done = await p;
  ok(done === true, "ban goes ahead after reason + confirm");
  ok(calls.some(c => typeof c === "string" && c.startsWith("confirm:") && c.includes("Reason: Posting spam")), "second confirm repeats the reason");
  ok(calls.some(c => Array.isArray(c) && c[0] === "ban_user" && c[1].p_reason === "Posting spam" && c[1].p_user === "u1"), "ban_user is called with the reason");
  // cancelling the second confirm stops the ban
  calls.length = 0; answers.ok = false; nodes.length = 0;
  const p2 = ctx.out.adminBan("u2", "Bo"); await new Promise(r => setTimeout(r, 0));
  const d2 = nodes[0].kids[0]; d2.kids.find(k => k.t === "textarea").value = "Harassing members"; d2.kids.find(k => k.c === "ask-btns").kids[1].click();
  ok((await p2) === false && !calls.some(c => Array.isArray(c) && c[0] === "ban_user"), "saying no to the second confirm does not ban");
  // Removed section
  await ctx.out.adminUndoLoad();
  const all = []; (function walk(n) { all.push(n); (n.kids || []).forEach(walk); })(box);
  const btns = all.filter(n => n.text === "↩️ Bring back");
  ok(btns.length === 3, "Removed section shows a Bring back button per item");
  for (const b of btns) await b.click();
  const rp = calls.filter(c => Array.isArray(c)).map(c => c[0]);
  ok(rp.includes("restore_content") && rp.includes("restore_spot") && rp.includes("restore_host_page"), "each kind calls its own bring-back");
  ok(calls.includes("loadSpots"), "bringing a spot back refreshes the spots");
  // nothing for an admin with no matching box
  await new Promise(r => setTimeout(r, 20)); ctx.adminCan = () => false; box.kids = []; await ctx.out.adminUndoLoad();
  ok(box.kids.length === 0, "no matching box = nothing shown");
  // wiring
  ok(/adminBan\(r\.target_user/.test(read("js/11-accounts-social.js")) && !/db\.rpc\("ban_user"/.test(read("js/11-accounts-social.js")), "Reports screen uses the new ban flow");
  ok(/data-asec="removed"/.test(read("index.html")) && read("index.html").includes("js/42-admin-undo.js") && read("sw.js").includes("./js/42-admin-undo.js"), "Removed section is wired into index.html and the offline list");
  ok(/id: "removed"[^}]*any:/.test(read("js/40-admin-page.js")), "Removed button shows for any matching box");
  console.log(bad ? "SOME FAILED" : "ALL OK"); process.exit(bad ? 1 : 0);
})();
