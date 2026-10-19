// Admin controls step 7: remove a reported message/photo, hide a public spot (setup/84, js/44-admin-hide.js).
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };

const sql = read("setup/84-remove-and-hide.sql");
ok(/hide_spot[\s\S]*has_power\('hide_spots'\)/.test(sql) && /length\(p_reason\) < 5/.test(sql), "hiding a spot needs the Hide box and a reason");
ok(/Only public spots can be hidden/.test(sql), "only public spots can be hidden");
ok(/enqueue_notification\(s\.created_by, 'safety'/.test(sql), "the owner gets an alert that can't be switched off");
ok(/hidden_at is null or s\.created_by = auth\.uid\(\)/.test(sql), "hidden spots are seen only by their owner");
ok(/guard_hidden/.test(sql) && /app\.admin_rpc/.test(sql), "owners can't un-hide their own spot");
ok(/A chat message can only be removed when someone has reported it/.test(sql), "messages are removable only through a report");
ok(/A photo can only be removed when its catch has been reported/.test(sql), "photos are removable only through a report");
ok(/log_admin\('spot_hidden'/.test(sql) && /log_admin\('photo_hidden'/.test(sql), "hiding is logged");

const js = read("js/44-admin-hide.js");
const calls = [], toasts = [];
const ctx = {
  adminCan: p => p === "hide_spots", askReason: async () => "Not a real fishing place", alert: m => calls.push("alert:" + m), toast: m => toasts.push(m), window: {},
  db: { rpc: async (n, a) => { calls.push([n, a]); return {}; } }
};
vm.createContext(ctx);
vm.runInContext(js + "\nthis.out = { adminHideSpot };", ctx);
(async () => {
  ok(await ctx.out.adminHideSpot("s1", "Bad spot") === true, "hide returns true");
  ok(calls.some(x => Array.isArray(x) && x[0] === "hide_spot" && x[1].p_id === "s1" && /fishing/.test(x[1].p_reason)), "hide_spot called with the spot and reason");
  ok(toasts.includes("Spot hidden ✓"), "toast shown");
  ctx.adminCan = () => false;
  calls.length = 0;
  ok(await ctx.out.adminHideSpot("s1", "x") === false && !calls.length, "no Hide box = nothing happens");
  const r = read("js/11-accounts-social.js");
  ok(/adminHideSpot\(x\.id, x\.name\)/.test(r) && /Hide this spot \(admin\)/.test(r), "map pop-up has a hide button for admins");
  ok(/"Remove message"/.test(r) && /"Hide photo only"/.test(r) && /"🙈 Hide spot"/.test(r), "Reports screen has Remove message, Hide photo only, Hide spot");
  const u = read("js/42-admin-undo.js");
  ok(/hidden_spot: \["unhide_spot"/.test(u) && /photo: \["show_catch_photos"/.test(u) && /message: \["restore_content"/.test(u), "Removed section can bring all three back");
  ok(/spot_hidden/.test(read("js/39-admin-log.js")), "log has plain words for hiding");
  ok(read("index.html").includes("js/44-admin-hide.js") && read("sw.js").includes("./js/44-admin-hide.js"), "script is in index.html and the offline list");
  console.log(bad ? "SOME FAILED" : "ALL OK"); process.exit(bad ? 1 : 0);
})();
