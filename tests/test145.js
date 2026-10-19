// Admin controls step 6: warn someone (setup/83, js/43-admin-warn.js).
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };

const sql = read("setup/83-warn-someone.sql");
ok(/warn_user[\s\S]*has_power\('warn'\)/.test(sql) && /length\(p_reason\) < 5/.test(sql), "warning needs the Warn box and a reason of at least 5 letters");
ok(/enqueue_notification\(p_user, 'safety'/.test(sql), "the person gets an alert that can't be switched off (kind 'safety')");
ok(/cannot warn yourself/.test(sql) && /Admins cannot be warned/.test(sql), "can't warn yourself or another admin");
ok(/revoke all on public\.admin_warnings from anon, authenticated;\s*grant select on public\.admin_warnings to authenticated/.test(sql), "warnings are read-only from the app");
ok(/create policy "admins read warnings"[^;]*has_power\('warn'\)/.test(sql), "only admins can read warnings");
ok(/log_admin\('person_warned'/.test(sql), "every warning is logged");
ok(!/lat|lng/i.test(sql.replace(/--.*$/gm, "")), "no coordinates stored");

const js = read("js/43-admin-warn.js");
const calls = [], nodes = [];
function el(t, c, txt) { const e = { t, c, text: txt || "", kids: [], style: {}, appendChild(k) { this.kids.push(k); return k; }, addEventListener(ev, f) { this[ev] = f; }, setAttribute() {}, remove() {}, focus() {} }; return e; }
const ctx = {
  adminCan: () => true, el, alert: m => calls.push("alert:" + m), toast: m => calls.push("toast:" + m), window: {},
  document: { activeElement: null, body: { appendChild: n => nodes.push(n) }, createElement: t => el(t) },
  db: {
    from: () => ({ select: () => ({ in: async () => ({ data: [{ user_id: "u1" }, { user_id: "u1" }, { user_id: "u2" }] }) }) }),
    rpc: async (n, a) => { calls.push([n, a]); return {}; }
  }
};
vm.createContext(ctx);
vm.runInContext(read("js/42-admin-undo.js").split("const REMOVED_KIND")[0] + "\n" + js + "\nthis.out = { adminWarn, adminWarnCounts, adminWarnText, adminBan };", ctx);
(async () => {
  const c = await ctx.out.adminWarnCounts(["u1", "u2", "u3"]);
  ok(c.u1 === 2 && c.u2 === 1 && !c.u3, "warning counts are tallied per person");
  ok(ctx.out.adminWarnText(1) === "⚠️ 1 earlier warning" && ctx.out.adminWarnText(3) === "⚠️ 3 earlier warnings" && ctx.out.adminWarnText(0) === "", "count wording");
  const p = ctx.out.adminWarn("u1", "Tess", "r1"); await new Promise(r => setTimeout(r, 0));
  const dlg = nodes[0].kids[0], ta = dlg.kids.find(k => k.t === "textarea"), btn = dlg.kids.find(k => k.c === "ask-btns").kids[1];
  ok(btn.text === "Send warning", "the box button says Send warning");
  ta.value = "no"; btn.click();
  ok(/at least/.test(dlg.kids.find(k => k.c === "msg err").textContent), "too-short reason refused");
  ta.value = "Please keep comments friendly"; btn.click();
  ok((await p) === true, "warning sent");
  ok(calls.some(x => Array.isArray(x) && x[0] === "warn_user" && x[1].p_user === "u1" && x[1].p_report === "r1" && /friendly/.test(x[1].p_reason)), "warn_user called with the person, reason and report");
  // a ban confirm shows the warnings
  calls.length = 0; nodes.length = 0; let shown = "";
  ctx.askOk = async t => { shown = t; return false; };
  const b = ctx.out.adminBan("u1", "Tess"); await new Promise(r => setTimeout(r, 0));
  const d2 = nodes[0].kids[0]; d2.kids.find(k => k.t === "textarea").value = "Repeated harassment"; d2.kids.find(k => k.c === "ask-btns").kids[1].click(); await b;
  ok(/2 earlier warnings/.test(shown), "the ban confirm shows the earlier warnings");
  const r = read("js/11-accounts-social.js");
  ok(/adminWarn\(r\.target_user/.test(r) && /adminCan\("warn"\)/.test(r), "Reports screen has a Warn button for admins with the Warn box");
  ok(/adminWarnCounts/.test(r) && /adminWarnText/.test(r), "Reports lines show earlier warnings");
  ok(read("index.html").includes("js/43-admin-warn.js") && read("sw.js").includes("./js/43-admin-warn.js"), "script is in index.html and the offline list");
  console.log(bad ? "SOME FAILED" : "ALL OK"); process.exit(bad ? 1 : 0);
})();
