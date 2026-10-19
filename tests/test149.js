// Admin controls step 10: coin corrections, locked (setup/87, js/47-admin-gated.js).
// The private-spot view, reported-chat review and monthly totals were built and then DROPPED (Oct 18): they would break privacy promises.
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };

const sql = read("setup/87-coin-fix-and-chat-review.sql");
ok(/\('coin_corrections', false/.test(sql), "the coin switch starts closed");
ok(/admin_coin_correct[\s\S]*has_power\('correct_coins'\)[\s\S]*gate_is_open\('coin_corrections'\)/.test(sql), "coin correction needs the box AND the open switch");
ok(/length\(p_reason\) < 10/.test(sql), "a typed reason is required");
ok(/'correction', 'fix:'/.test(sql) && !/update public\.coin_ledger|delete from public\.coin_ledger/.test(sql), "coins are corrected by a new ledger line, never by editing");
ok(/below zero/.test(sql), "a correction can't push a balance below zero");

// the dropped features are really gone from the app
ok(!fs.existsSync(path.join(root, "js/46-admin-private.js")) && !fs.existsSync(path.join(root, "js/48-share-totals.js")), "private-spot and monthly-totals scripts are gone");
const all = ["index.html", "sw.js", "js/40-admin-page.js", "js/47-admin-gated.js", "js/12-contests-alerts.js"].map(read).join("\n");
ok(!/46-admin-private|48-share-totals|private-admin|chat-admin|totals-admin|share-totals-box|adminChatLoad|adminPrivateLoad|shareTotalsOn|admin_open_private_spot|admin_open_reported_chat|set_share_totals/.test(all), "no leftovers of the dropped features in the app");

const calls = [];
function el(t, c, txt) { const e = { t, c, text: txt || "", kids: [], style: {}, value: "", appendChild(k) { this.kids.push(k); return k; }, addEventListener(ev, f) { this[ev] = f; }, setAttribute() {}, set innerHTML(v) { this.kids = []; } }; return e; }
const coins = el("div");
function makeCtx(open, can) {
  coins.kids = [];
  const ctx = {
    adminCan: () => can, el, alert() {}, toast() {}, askReason: async () => "refund for a race that glitched",
    document: { getElementById: id => id === "coins-admin" ? coins : null }, window: {},
    db: { rpc: async (n, a) => { calls.push([n, a]);
      if (n === "gate_is_open") return { data: open };
      if (n === "admin_coin_person") return { data: [{ user_id: "u1", name: "Tess", email: "t@x.com", coins: 10, gems: 0 }] };
      return { data: 15 }; } }
  };
  vm.createContext(ctx); vm.runInContext(read("js/47-admin-gated.js") + "\nthis.out = { adminCoinsLoad };", ctx); return ctx;
}
const tick = () => new Promise(r => setTimeout(r, 0));
(async () => {
  let c = makeCtx(false, true); await c.out.adminCoinsLoad();
  ok(coins.kids.some(k => /Locked/.test(k.text)) && !coins.kids.some(k => k.t === "input"), "coins: switch closed shows Locked and no search");
  c = makeCtx(true, false); await c.out.adminCoinsLoad();
  ok(coins.kids.length === 0, "no box ticked: nothing shown");
  c = makeCtx(true, true); calls.length = 0; await c.out.adminCoinsLoad();
  const q = coins.kids.find(k => k.t === "input"), go = coins.kids.find(k => k.text === "Find"), list = coins.kids[coins.kids.length - 1];
  q.value = "tess"; go.click(); await tick();
  ok(calls.some(x => x[0] === "admin_coin_person" && x[1].p_q === "tess"), "person search calls the server");
  const card = list.kids[0], frm = card.kids.find(k => k.kids && k.kids.some(x => x.t === "select"));
  const num = frm.kids.find(k => k.t === "input"), apply = frm.kids.find(k => k.t === "button");
  frm.kids.find(k => k.t === "select").value = "coins"; num.value = "-20"; calls.length = 0; apply.click(); await tick(); await tick();
  const e = calls.find(x => x[0] === "admin_coin_correct");
  ok(e && e[1].p_user === "u1" && e[1].p_amount === -20 && e[1].p_currency === "coins" && /glitched/.test(e[1].p_reason), "correction sends person, amount, currency and the typed reason");
  ok(read("index.html").includes("js/47-admin-gated.js") && read("index.html").includes('id="coins-admin"') && read("sw.js").includes("./js/47-admin-gated.js"), "script and section are in index.html and the offline list");
  ok(/id: "coins"[^}]*correct_coins/.test(read("js/40-admin-page.js")), "Admin page has the Coins section");
  // the two small fixes from v138 stay
  const js09 = read("js/09-map-forecast.js"), js11 = read("js/11-accounts-social.js");
  ok(/my_hidden_spots/.test(js09) && /Hidden from others by the team/.test(js09), "owner sees a label on a spot the team hid");
  ok(/adminPhotoShown/.test(js11) && /photoN\[r\.target_id\] > 0/.test(js11), "Hide photo only shows only when the catch still has a photo");
  console.log(bad ? "SOME FAILED" : "ALL OK"); process.exit(bad ? 1 : 0);
})();
