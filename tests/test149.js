// Admin controls step 10 (first part, locked): coin corrections and reported-chat review (setup/87, js/47-admin-gated.js).
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };

const sql = read("setup/87-coin-fix-and-chat-review.sql");
ok(/\('coin_corrections', false/.test(sql) && /\('chat_review', false/.test(sql), "both new switches start closed");
ok(/admin_coin_correct[\s\S]*has_power\('correct_coins'\)[\s\S]*gate_is_open\('coin_corrections'\)/.test(sql), "coin correction needs the box AND the open switch");
ok(/admin_open_reported_chat[\s\S]*has_power\('review_chat'\)[\s\S]*gate_is_open\('chat_review'\)/.test(sql), "chat review needs the box AND the open switch");
ok(/length\(p_reason\) < 10/.test(sql), "a typed reason is required");
ok(/'correction', 'fix:'/.test(sql) && !/update public\.coin_ledger|delete from public\.coin_ledger/.test(sql), "coins are corrected by a new ledger line, never by editing");
ok(/below zero/.test(sql), "a correction can't push a balance below zero");
ok(/target_type = 'message'/.test(sql), "only a chat tied to a reported message can be opened");
ok(!/log_admin\('chat_reviewed'[^;]*body/.test(sql), "the log never holds message text");

const calls = [];
function el(t, c, txt) { const e = { t, c, text: txt || "", kids: [], style: {}, value: "", appendChild(k) { this.kids.push(k); return k; }, addEventListener(ev, f) { this[ev] = f; }, setAttribute() {}, set innerHTML(v) { this.kids = []; } }; return e; }
const coins = el("div"), chat = el("div");
function makeCtx(open, can) {
  coins.kids = []; chat.kids = [];
  const ctx = {
    adminCan: () => can, el, alert() {}, toast() {}, askReason: async () => "refund for a race that glitched",
    document: { getElementById: id => id === "coins-admin" ? coins : id === "chat-admin" ? chat : null }, window: {},
    db: { rpc: async (n, a) => { calls.push([n, a]);
      if (n === "gate_is_open") return { data: open };
      if (n === "admin_coin_person") return { data: [{ user_id: "u1", name: "Tess", email: "t@x.com", coins: 10, gems: 0 }] };
      if (n === "admin_reported_chats") return { data: [{ report_id: "r1", reason: "harassment", about_name: "Tess", reporter_name: "Sam", created_at: "2026-10-18T10:00:00Z" }] };
      if (n === "admin_open_reported_chat") return { data: [{ msg_id: "m1", at: "2026-10-18T10:00:00Z", sender_name: "Tess", body: "hello", removed: false, is_reported: true }] };
      return { data: 15 }; } }
  };
  vm.createContext(ctx); vm.runInContext(read("js/47-admin-gated.js") + "\nthis.out = { adminCoinsLoad, adminChatLoad };", ctx); return ctx;
}
const tick = () => new Promise(r => setTimeout(r, 0));
(async () => {
  let c = makeCtx(false, true); await c.out.adminCoinsLoad(); await c.out.adminChatLoad();
  ok(coins.kids.some(k => /Locked/.test(k.text)) && !coins.kids.some(k => k.t === "input"), "coins: switch closed shows Locked and no search");
  ok(chat.kids.some(k => /Locked/.test(k.text)), "chat: switch closed shows Locked");
  c = makeCtx(true, false); await c.out.adminCoinsLoad(); await c.out.adminChatLoad();
  ok(coins.kids.length === 0 && chat.kids.length === 0, "no box ticked: nothing shown");
  c = makeCtx(true, true); calls.length = 0; await c.out.adminCoinsLoad();
  const q = coins.kids.find(k => k.t === "input"), go = coins.kids.find(k => k.text === "Find"), list = coins.kids[coins.kids.length - 1];
  q.value = "tess"; go.click(); await tick();
  ok(calls.some(x => x[0] === "admin_coin_person" && x[1].p_q === "tess"), "person search calls the server");
  const card = list.kids[0], frm = card.kids.find(k => k.kids && k.kids.some(x => x.t === "select"));
  const num = frm.kids.find(k => k.t === "input"), apply = frm.kids.find(k => k.t === "button");
  frm.kids.find(k => k.t === "select").value = "coins"; num.value = "-20"; calls.length = 0; apply.click(); await tick(); await tick();
  const e = calls.find(x => x[0] === "admin_coin_correct"); if (!e) console.log("calls:", JSON.stringify(calls));
  ok(e && e[1].p_user === "u1" && e[1].p_amount === -20 && e[1].p_currency === "coins" && /glitched/.test(e[1].p_reason), "correction sends person, amount, currency and the typed reason");
  await c.out.adminChatLoad(); await tick();
  const btn = chat.kids[chat.kids.length - 2].kids[0].kids.find(k => /Read this chat/.test(k.text)); calls.length = 0; btn.click(); await tick(); await tick();
  ok(calls.some(x => x[0] === "admin_open_reported_chat" && x[1].p_report === "r1" && /glitched/.test(x[1].p_reason)), "reading a chat sends the report and the typed reason");
  ok(read("index.html").includes("js/47-admin-gated.js") && read("index.html").includes('id="coins-admin"') && read("index.html").includes('id="chat-admin"') && read("sw.js").includes("./js/47-admin-gated.js"), "script and sections are in index.html and the offline list");
  ok(/id: "coins"[^}]*correct_coins/.test(read("js/40-admin-page.js")) && /id: "chat"[^}]*review_chat/.test(read("js/40-admin-page.js")), "Admin page has both sections");
  console.log(bad ? "SOME FAILED" : "ALL OK"); process.exit(bad ? 1 : 0);
})();
