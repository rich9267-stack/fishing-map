// Builds data/ramps/<ST>.json: each state agency's public + open ramps, saved in the app's own files so phones load them fast.
// Run on the computer (Node 18+):  node tools/make-ramp-snapshots.js        (all states)   or   node tools/make-ramp-snapshots.js GA TX
// It uses the same name / keep / info rules as js/61 (stPlace), so a snapshot place equals a live place. Then: sh bump.sh, commit, push.
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
const src61 = read("js/61-state-ramps.js");
const src53 = read("js/53-us-states.js");
const ctx = { console, Math, isFinite, Array, Object, Set, JSON, RegExp, String, Number, parseInt };
vm.createContext(ctx);
vm.runInContext(src53 + "\n" + src61 + "\nthis.api = { STATE_RAMPS, stPlace };", ctx);
const { STATE_RAMPS, stPlace } = ctx.api;
const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(STATE_RAMPS);
const outDir = path.join(root, "data", "ramps"); fs.mkdirSync(outDir, { recursive: true });

async function getJson(url) {
  for (let i = 0; i < 3; i++) {
    try { const c = new AbortController(); const t = setTimeout(() => c.abort(), 60000); const r = await fetch(url, { signal: c.signal }); clearTimeout(t); if (r.ok) { const j = await r.json(); if (!j.error) return j; } } catch (e) { /* retry */ }
    await new Promise(r => setTimeout(r, 2000));
  }
  return null;
}
async function one(st) {
  const c = STATE_RAMPS[st], feats = [];
  for (let off = 0; off < 50000; off += 1000) {
    const qs = new URLSearchParams({ where: "1=1", outFields: c.f, returnGeometry: "true", outSR: "4326", resultOffset: String(off), resultRecordCount: "1000", orderByFields: "OBJECTID", f: "json" });
    let j = await getJson(c.url + "/query?" + qs);
    if (!j) { qs.delete("orderByFields"); j = await getJson(c.url + "/query?" + qs); }   // a few layers have no OBJECTID column
    if (!j || !Array.isArray(j.features)) { console.log(st, "FAILED (kept the old file, if any)"); return; }
    feats.push(...j.features);
    if (!j.exceededTransferLimit && j.features.length < 1000) break;
  }
  const seen = new Set(), items = [];
  feats.map(f => stPlace(st, f)).filter(Boolean).forEach(p => {
    if (seen.has(p.key)) return; seen.add(p.key);
    const o = { n: p.name, la: +p.lat.toFixed(5), ln: +p.lng.toFixed(5) };
    if (p.county) o.c = p.county;
    if (p.kind && p.kind !== "ramp") o.k = p.kind;
    if (p.details && Object.keys(p.details).length) o.d = p.details;
    items.push(o);
  });
  if (!items.length) { console.log(st, "gave 0 places (kept the old file, if any)"); return; }
  fs.writeFileSync(path.join(outDir, st + ".json"), JSON.stringify({ t: new Date().toISOString().slice(0, 10), items }));
  console.log(st, items.length, "of", feats.length);
}
(async () => { for (let i = 0; i < want.length; i += 5) await Promise.all(want.slice(i, i + 5).map(one)); })();
