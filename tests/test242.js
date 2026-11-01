// test242: v261 (speed plan steps 4 + 5) — profile / group / business picture links are asked for once and reused for their hour
// (kept on the phone, two asks for one picture share one, asked again 10 minutes before they run out, never used for another person,
// emptied on sign-out); supabase-js and exifr have exact version numbers and sw.js uses the saved copy of an exact-version library
// as is (no background re-check), kept across app updates.
process.env.TZ = "America/New_York";
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const sun = fs.readFileSync(require.resolve("suncalc"), "utf8");
const leaf = fs.readFileSync(require.resolve("leaflet/dist/leaflet.js"), "utf8");
const html = require("./load")();
const root = path.join(__dirname, "..");
let ME = "u-sam";
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const wait = ms => new Promise(r => setTimeout(r, ms));

const START = () => ({ member: { email: "sam@x.com", display_name: "Sam", is_admin: false, is_owner: false, status: "approved", terms_version: 1 }, me_extras: null, home_waters: null, app_prefs: { palette: "original", wn_seen: "2099" },
  tutorials: [], unread: 0, blocks: [], follows: [], notif_welcomed: { welcomed_at: "2026-01-01" }, hidden_spots: [], licenses: [], shares: [], picks: [],
  friendships: [], friends_accepted: [], float_plans: [], tackle: [], tournaments: [], tournament_members: [], hall_of_fame: [],
  notifications: [], trip_plans: [], trip_plan_rsvps: [], rules_ver: "v1" });

async function open(saved) {
  const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://example.org/fishing-map/", beforeParse(w) {
    w.eval(sun); w.Element.prototype.scrollIntoView = () => {};
    const chain = () => { const p = () => Promise.resolve({ data: [], error: null, count: 0 });
      const o = {}; ["eq", "is", "in", "or", "ilike", "gte", "lte", "gt", "lt", "neq", "order", "select", "not", "contains", "match", "filter", "overlaps", "limit"].forEach(k => { o[k] = () => o; });
      o.range = () => p(); o.single = () => Promise.resolve({ data: null, error: null }); o.maybeSingle = () => Promise.resolve({ data: null, error: null });
      o.then = (a, b) => p().then(a, b); return o; };
    w.__signs = [];
    w.supabase = { createClient: () => ({
      auth: { getSession: async () => ({ data: { session: { user: { id: ME, email: "sam@x.com", user_metadata: {} } } } }), onAuthStateChange: () => {}, signOut: async () => {} },
      rpc: async fn => fn === "ensure_profile" ? { data: { user_id: ME, handle: "sam", display_name: "Sam" }, error: null } : fn === "app_start" ? { data: START(), error: null } : { data: null, error: null },
      channel: () => { const c = { on: () => c, subscribe: () => c }; return c; }, removeChannel: () => {},
      storage: { from: b => ({ createSignedUrls: async () => ({ data: [] }), list: async () => ({ data: [] }),
        createSignedUrl: async (p, secs) => { w.__signs.push({ b, p, secs }); await new Promise(r => setTimeout(r, 30)); return { data: { signedUrl: `https://x.supabase.co/storage/v1/object/sign/${b}/${p}?token=${w.__signs.length}-${Math.random().toString(36).slice(2)}` } }; } }) },
      from: () => ({ select: chain, delete: chain, insert: chain, upsert: () => Promise.resolve({ error: null }), update: chain }) }) };
    w.fetch = async () => ({ ok: true, json: async () => ({ properties: {}, features: [], elements: [], results: [], items: [] }) });
    if (saved) w.localStorage.setItem("fm-pic-links", saved);
  }});
  const w = dom.window; w.scrollTo = () => {}; w.requestAnimationFrame = f => setTimeout(f, 16); w.SVGSVGElement.prototype.createSVGRect = () => ({}); w.eval(leaf);
  await wait(4000);
  w.__signs.length = 0;   // only count the asks this check makes
  return w;
}

(async () => {
  // ---- step 4: picture links ----
  let w = await open();
  const u1 = await w.eval('avatarUrl("u3/a.jpg")');
  ok(/token=/.test(u1) && w.__signs.length === 1 && w.__signs[0].b === "avatars" && w.__signs[0].secs === 3600, "first time: one link asked for, good for an hour");
  const u2 = await w.eval('avatarUrl("u3/a.jpg")');
  ok(u2 === u1 && w.__signs.length === 1, "second time: the same link, nothing asked");
  const both = await w.eval('Promise.all([avatarUrl("u4/b.jpg"), avatarUrl("u4/b.jpg"), avatarUrl("u4/b.jpg")])');
  ok(both[0] && both.every(x => x === both[0]) && w.__signs.length === 2, "three asks at once for one picture share one link request");
  await w.eval('avatarUrl("g1/c.jpg", "group-avatars")');
  ok(w.__signs.length === 3 && w.__signs[2].b === "group-avatars", "group / business pictures go through the same path (their own bucket)");
  const saved = w.localStorage.getItem("fm-pic-links");
  const s = JSON.parse(saved || "null");
  ok(s && s.who === ME && s.l["avatarsu3/a.jpg"] && s.l["avatarsu3/a.jpg"][0] === u1 && s.l["avatarsu3/a.jpg"][1] > Date.now() + 50 * 60000, "links are kept on the phone with when they run out");

  // a fresh app open on the same phone: no asks for pictures it already has links for
  w = await open(saved);
  const u3 = await w.eval('avatarUrl("u3/a.jpg")');
  ok(u3 === u1 && w.__signs.length === 0, "next app open: the saved link is reused, nothing asked");

  // a link with less than 10 minutes left is asked for again
  const old = JSON.parse(saved); old.l["avatarsu3/a.jpg"][1] = Date.now() + 5 * 60000;
  w = await open(JSON.stringify(old));
  const u4 = await w.eval('avatarUrl("u3/a.jpg")');
  ok(u4 !== u1 && w.__signs.length === 1, "a link about to run out (5 min left) is asked for again");
  ok(await w.eval('avatarUrl("u4/b.jpg")') === both[0] && w.__signs.length === 1, "…the others are still reused");

  // someone else signed in on this phone: none of the saved links are used
  ME = "u-other";
  w = await open(saved);
  await w.eval('avatarUrl("u3/a.jpg")');
  ok(w.__signs.length === 1, "another person on this phone: the saved links are not used");
  ME = "u-sam";

  // signing out empties them
  w = await open(saved);
  await w.eval("photoCacheClear()");
  ok(w.localStorage.getItem("fm-pic-links") === null, "sign-out: saved picture links removed from the phone");
  await w.eval('avatarUrl("u3/a.jpg")');
  ok(w.__signs.length === 1, "…and forgotten for this visit too");

  // ---- step 5: exact library versions ----
  const page = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const libs = [...page.matchAll(/<script src="(https:\/\/[^"]+)"/g)].map(m => m[1]);
  ok(libs.some(u => u.endsWith("@supabase/supabase-js@2.118.0")) && libs.some(u => u.includes("exifr@7.1.3/")), "supabase-js 2.118.0 and exifr 7.1.3 are pinned");
  const exactRe = /@\d+\.\d+\.\d+(?:[-.\w]*)?(?:\/|$)|\/\d+\.\d+\.\d+\//;
  ok(libs.length >= 4 && libs.every(u => exactRe.test(new URL(u).pathname)), "every outside library in index.html has an exact version (" + libs.length + ")");

  // sw.js: an exact-version library is served from the phone with no network check; others still refresh; the libs box survives updates
  const swSrc = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const H = {}, store = {}, fetched = [];
  const mkCache = n => ({ match: async r => (store[n] || {})[r.url || r], put: async (r, res) => { (store[n] = store[n] || {})[r.url || r] = res; }, addAll: async () => {} });
  const ctx = { self: { addEventListener: (t, f) => { H[t] = f; }, location: { origin: "https://example.org" }, skipWaiting: () => {}, clients: { claim: async () => {} } },
    caches: { open: async n => mkCache(n), keys: async () => Object.keys(store).concat(["fishing-map-v1"]), delete: async n => { delete store[n]; return true; } },
    fetch: async r => { fetched.push(r.url || r); return { ok: true, clone() { return this; }, body: "net" }; }, URL, Promise, console };
  vm.createContext(ctx); vm.runInContext(swSrc, ctx);
  const ask = async url => { let p; H.fetch({ request: { method: "GET", url, mode: "no-cors" }, respondWith: x => { p = x; } }); return p; };
  const SB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0";
  await ask(SB); await wait(10);
  ok(fetched.includes(SB) && store["fishing-map-libs"] && store["fishing-map-libs"][SB], "first time: downloaded once and kept in the libraries box");
  fetched.length = 0; await ask(SB); await wait(10);
  ok(!fetched.length, "next time: the phone's copy, no network check at all");
  const OPEN = "https://cdn.jsdelivr.net/npm/somelib@2/x.js";
  await ask(OPEN); await wait(10); fetched.length = 0; await ask(OPEN); await wait(10);
  ok(fetched.includes(OPEN), "a library without an exact version is still refreshed in the background");
  store["fishing-map-v1"] = {};
  let done; H.activate({ waitUntil: p => { done = p; } }); await done;
  ok(store["fishing-map-libs"] && !store["fishing-map-v1"], "an app update keeps the libraries box (old app copies are still removed)");

  console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
})();
