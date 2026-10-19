// Admin controls step 4: admins and tick boxes (setup/81, js/38 adminCan, js/41-admin-people.js).
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };

const sql = read("setup/81-admin-tick-boxes.sql");
ok(/add column if not exists powers text\[\] not null default '\{\}'/.test(sql), "admins start with nothing ticked");
ok(/p = any \(powers\)/.test(sql) && /open_private_spots','review_chat','correct_coins','delete_person_data'\) then return false/.test(sql), "has_power checks the ticked boxes; gated boxes stay owner-only");
ok(/app\.admin_rpc/.test(sql) && /before insert or update on public\.members/.test(sql), "nobody can promote themselves except through set_admin");
ok(/cannot be changed/.test(sql) && /cannot change your own admin boxes/.test(sql) && /only give boxes you have yourself/.test(sql), "set_admin protects the owner, yourself and stops handing out boxes you lack");
ok(/revoke all on function public\.set_admin[^;]*from public, anon/.test(sql), "set_admin is for signed-in users only");
["official_places", "dashboard", "ban", "tournaments", "pages", "delete_spot", "reports", "people", "rules", "invite", "remove_from_list", "problems"].forEach(p =>
  ok(sql.includes("'" + p + "'") || sql.includes('"' + p + '"'), "server asks for the " + p + " box"));
ok(!/revoke|truncate|delete from|update public\.members set is_admin = true/i.test(sql.replace(/--.*$/gm, "").replace(/revoke all on function[^;]*;/g, "")), "no risky statements");

// ---- the app side
const powers = read("js/38-admin-powers.js");
function app(me) {
  const ctx = { me }; vm.createContext(ctx);
  vm.runInContext(powers + "\nthis.out = { can: adminCan, any: adminAny };", ctx); return ctx.out;
}
let a = app({ isAdmin: true, isOwner: true });
ok(a.can("ban") && a.can("open_private_spots") && a.any(), "owner can do everything");
a = app({ isAdmin: true, powers: ["reports"] });
ok(a.can("reports") && !a.can("ban") && !a.can("open_private_spots") && a.any(), "admin only gets ticked boxes; gated boxes are locked");
a = app({ isAdmin: true, powers: [] });
ok(!a.can("reports") && !a.any(), "admin with nothing ticked has no Admin page");
a = app({ isAdmin: false, powers: ["reports"] });
ok(!a.can("reports") && !a.any(), "ordinary member can do nothing");
a = app({ isAdmin: true, powers: null });
ok(a.can("reports"), "if boxes could not be loaded the screen still shows (the server decides)");

const js = read("js/41-admin-people.js"), h = read("index.html"), c11 = read("js/11-accounts-social.js");
ok(/my_powers/.test(c11) && /adminsLoad/.test(c11), "sign-in loads the boxes; Admin page loads the Admins section");
ok(/data-asec="admins"/.test(h) && h.includes("js/41-admin-people.js") && read("sw.js").includes("./js/41-admin-people.js"), "Admins section is wired into index.html and the offline list");
ok(/id: "admins"[^}]*manage_admins/.test(read("js/40-admin-page.js")), "Admins button needs the Manage admins box");
["js/09-map-forecast.js", "js/10-tools-safety.js", "js/12-contests-alerts.js", "js/17-license-help.js", "js/28-host-pages.js", "js/34-official-admin.js"].forEach(f =>
  ok(!/me\.isAdmin|me && me\.isAdmin/.test(read(f)), f + " asks for a box instead of 'is admin'"));

// ---- the Admins section with a fake page and fake database
function el(t, c, txt) { const e = { t, c, kids: [], text: txt || "", dataset: {}, style: {}, checked: false, disabled: false, appendChild(k) { this.kids.push(k); return k; }, addEventListener(ev, f) { this[ev] = f; }, setAttribute() {} }; return e; }
const rpcs = [];
const members = [
  { email: "rich9267@gmail.com", display_name: "Richard", is_admin: true, is_owner: true, powers: [], status: "approved" },
  { email: "t@x.com", display_name: "Tess", is_admin: true, is_owner: false, powers: ["reports"], status: "approved" },
  { email: "b@x.com", display_name: "Bo", is_admin: false, is_owner: false, powers: [], status: "approved" }
];
const box = el("div");
const ctx = {
  me: { isAdmin: true, isOwner: true }, el, askOk: async () => true, window: {},
  document: { getElementById: id => id === "admins-admin" ? box : null, createElement: t => el(t) },
  db: { from: () => ({ select: () => ({ order: async () => ({ data: members }) }) }), rpc: async (n, a) => { rpcs.push([n, a]); return {}; } }
};
vm.createContext(ctx); vm.runInContext(powers + "\n" + js + "\nthis.run = adminsLoad;", ctx);
(async () => {
  await ctx.run();
  const all = []; (function walk(n) { all.push(n); (n.kids || []).forEach(walk); })(box);
  const boxes = all.filter(n => n.t === "input");
  ok(boxes.length === 16 + 1 + 0, "one admin card shows 16 tick boxes + 1 locked one (" + boxes.length + ")");
  ok(all.filter(n => n.t === "input" && n.disabled).length === 1, "the gated coins box is locked");
  const reportsBox = boxes.find(b => b.checked); ok(!!reportsBox, "Tess's ticked box shows ticked");
  const save = all.find(n => n.c === "btn small" && n.text === "Save boxes"); await save.click();
  ok(rpcs.some(r => r[0] === "set_admin" && r[1].p_email === "t@x.com" && r[1].p_make === true && r[1].p_powers.join() === "reports"), "Save boxes calls set_admin with the ticked boxes");
  const full = all.find(n => n.text === "Full powers"); full.click();
  ok(boxes.filter(b => !b.disabled).every(b => b.checked), "Full powers ticks every normal box");
  all.find(n => n.t === "select").value = "b@x.com"; const go = all.find(n => n.id === "admin-new-go"); await go.click();
  ok(rpcs.some(r => r[0] === "set_admin" && r[1].p_email === "b@x.com" && r[1].p_powers.length === 0), "Make admin starts with nothing ticked");
  ctx.me = { isAdmin: true, isOwner: false, powers: ["reports"] }; box.kids = []; await ctx.run();
  ok(box.kids.length === 0, "someone without Manage admins sees nothing");
  console.log(bad ? "SOME FAILED" : "ALL OK"); process.exit(bad ? 1 : 0);
})();
