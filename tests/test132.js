// Sprint #6 step 4: trophy cups — winner message (js/14 cupToast) + prize lines on the tournament screen (js/12)
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const tank = read("js/14-tank.js"), cts = read("js/12-contests-alerts.js");
const i = tank.indexOf("async function cupToast"), j = tank.indexOf("async function tankClaim");
ok(i > 0 && j > i, "cupToast exists before tankClaim");
const toasts = []; let query = null, rows = [];
const ctx = { console, Date, Promise, setTimeout, me: { id: "u1" }, toast: (t, ms) => toasts.push(t),
  SHOP_ART: { trophy_gold: { n: "Gold trophy cup" }, trophy_silver: { n: "Silver trophy cup" } },
  db: { from: t => { query = { t }; const o = { select: () => o, eq: (c, v) => { query.eq = [c, v]; return o; }, gte: (c, v) => { query.gte = [c, v]; return Promise.resolve({ data: rows, error: null }); } }; return o; } } };
vm.createContext(ctx); vm.runInContext(tank.slice(i, j) + "\nthis.cupToast = cupToast;", ctx);
(async () => {
  rows = [{ item_key: "trophy_gold" }, { item_key: "gravel_blue" }];
  await ctx.cupToast();
  ok(toasts.length === 1 && /You won the Gold trophy cup!/.test(toasts[0]) && /Customize/.test(toasts[0]), "a new gold cup gives a message naming it");
  ok(query.t === "user_items" && query.eq[1] === "u1" && Date.now() - new Date(query.gte[1]).getTime() < 130000, "asks only for my items from the last 2 minutes");
  rows = [{ item_key: "gravel_blue" }]; await ctx.cupToast(); ok(toasts.length === 1, "no cup = no message");
  rows = [{ item_key: "trophy_gold" }, { item_key: "trophy_silver" }]; await ctx.cupToast();
  ok(/Gold trophy cup and the Silver trophy cup/.test(toasts[1]), "two cups are both named");
  ctx.db.from = () => { throw new Error("offline"); }; await ctx.cupToast(); ok(toasts.length === 2, "a failure stays silent");
  ok(/x\.reason === "tournament"\)\) \{ shop\.ready = false; setTimeout\(cupToast/.test(tank), "tankClaim calls cupToast after a tournament placing");
  ok(/Prizes \(top 3 on a board\): 🪙 200 \/ 120 \/ 80 coins · 💎 3 \/ 2 \/ 1 gems/.test(cts) && /t\.kind === "official"/.test(cts), "official tournaments list the prizes");
  ok(/run by a page, so it pays no coins, gems or cups/.test(cts), "page-run tournaments say they pay nothing");
  console.log(bad ? "FAILED" : "OK"); process.exit(bad ? 1 : 0);
})();
