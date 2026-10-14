// Shared by test88.js: loads the app's rank formula (js/07 weight table + js/15 rank table) without a browser,
// builds the grid of species × sizes, and turns each species' results into one fingerprint (md5).
// The database's fingerprints come from sqlQuery() run against fish_rank_calc and are saved in fish-rank-sql.json.
const fs = require("fs"), vm = require("vm"), path = require("path"), crypto = require("crypto");
function loadRank() {
  const js = f => fs.readFileSync(path.join(__dirname, "..", "js", f), "utf8");
  const a = js("07-measure-fishid.js"), b = js("15-fish-rank.js");
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(a.slice(0, a.indexOf("function estWeight")) + b.slice(0, b.indexOf("const rankLine")) +
    "\nthis.fishRank = fishRank; this.FISH_RANK_TABLE = FISH_RANK_TABLE;", ctx);
  return ctx;
}
const LENS = [3, 6.5, 9, 11, 14, 15.25, 18, 20, 22.5, 24, 27, 30, 30.5, 33, 34, 36, 40, 44.75, 48, 52, 60, 66, 72, 85, 95, 120];
const WTS = [0.25, 1, 2.4, 8.7, 20, 85];
function names(table) {
  const n = [];
  table.forEach(r => r[0].forEach(w => n.push(w)));
  return n.concat(["Snook (common)", "Jack crevalle", "Mangrove snapper", "Red snapper", "snapper", "Black drum", "Speckled trout",
    "Largemouth bass", "Peacock bass", "Florida gar", "Mystery fish", "", "BLACK GROUPER"]);
}
function rowsFor(sp) {   // same order as the SQL: lengths, then each weight real/estimated, then no size
  const r = LENS.map(l => [l, null, false]);
  WTS.forEach(w => { r.push([null, w, false]); r.push([null, w, true]); });
  r.push([null, null, false]);
  return r;
}
const line = (len, wt, est, k) => `${len ?? ""}/${wt ?? ""}/${est}:` + (k ? [k.power, k.tier, k.strength, k.speed, k.stamina, k.size].join(",") : "-");
function appPrints(ctx) {
  const out = {};
  names(ctx.FISH_RANK_TABLE).forEach(sp => {
    const s = rowsFor(sp).map(([len, wt, est]) => {
      const rk = ctx.fishRank({ species: sp, length_in: len, weight_lb: wt, weight_est: est }, true);
      return line(len, wt, est, rk && { power: rk.power, tier: rk.tier, strength: rk.stats.strength, speed: rk.stats.speed, stamina: rk.stats.stamina, size: rk.size });
    }).join("\n");
    out[sp] = crypto.createHash("md5").update(s).digest("hex");
  });
  return out;
}
function sqlQuery(ctx) {
  const arr = (a, t) => "array[" + a.map(v => t === "text" ? "'" + v.replace(/'/g, "''") + "'" : v).join(",") + "]::" + t + "[]";
  return `with n as (select sp, ns from unnest(${arr(names(ctx.FISH_RANK_TABLE), "text")}) with ordinality n(sp, ns)),
g as (select sp, ns, l::numeric len, null::numeric wt, false est, o k from n, unnest(${arr(LENS, "numeric")}) with ordinality l(l, o)
 union all select sp, ns, null, w, e, 100 + o * 2 + e::int from n, unnest(${arr(WTS, "numeric")}) with ordinality w(w, o), unnest(array[false,true]) e
 union all select sp, ns, null, null, false, 999 from n),
x as (select g.sp, g.ns, g.k, coalesce(g.len::text, '') || '/' || coalesce(g.wt::text, '') || '/' || g.est::text || ':' ||
  case when r.power is null then '-' else concat_ws(',', r.power, r.tier, r.strength, r.speed, r.stamina, r.size_pct) end t
  from g left join lateral public.fish_rank_calc(g.sp, g.len, g.wt, g.est) r on true)
select json_object_agg(sp, h) j from (select sp, md5(string_agg(t, E'\\n' order by k)) h from x group by sp) z;`;
}
module.exports = { loadRank, appPrints, sqlQuery, rowsFor, line };
if (require.main === module) process.stdout.write(sqlQuery(loadRank()));
