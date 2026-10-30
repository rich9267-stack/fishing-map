// test184: fewer photo downloads (Supabase egress). sw.js keeps catch photos by their storage path (token ignored) and the app empties
// that on sign-out / account delete; every new photo gets a small copy "<name>.t.jpg" used in lists, the feed and the games (the full
// photo only in the viewer); old photos of mine get their small copy made on the phone; signed links are kept on the phone for their hour.
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const cut = (s, a, b) => { const i = s.indexOf(a); if (i < 0) throw new Error("missing " + a); const j = s.indexOf(b, i); if (j < 0) throw new Error("missing " + b); return s.slice(i, j); };
const SB = "https://euxcisnyansdrzzjyvsl.supabase.co";
const signed = (p, tok) => `${SB}/storage/v1/object/sign/photos/${p}?token=${tok}`;

(async () => {
  // ---------- 1) sw.js: photos kept by path ----------
  {
    const stores = {}, net = [], handlers = {};
    const mkCache = name => (stores[name] = stores[name] || { m: new Map(),
      async match(k) { return this.m.get(typeof k === "string" ? k : k.url); }, async put(k, r) { this.m.set(typeof k === "string" ? k : k.url, r); },
      async keys() { return [...this.m.keys()].map(url => ({ url })); }, async delete(k) { return this.m.delete(typeof k === "string" ? k : k.url); }, async addAll() {} });
    const caches = { open: async n => mkCache(n), keys: async () => Object.keys(stores), delete: async n => delete stores[n], match: async () => undefined };
    const resp = (body, status) => ({ ok: status === 200, status: status || 200, body, clone() { return resp(body, status); } });
    const sw = {
      console, URL, Promise, caches, location: { origin: "https://rich9267-stack.github.io" }, clients: { claim: async () => {} }, skipWaiting: () => {},
      addEventListener: (t, f) => { handlers[t] = f; }, registration: {},
      fetch: async (u, o) => { const url = typeof u === "string" ? u : u.url; net.push({ url, o }); return resp("pic:" + new URL(url).pathname, /missing/.test(url) ? 400 : 200); }
    };
    sw.self = sw;
    vm.createContext(sw); vm.runInContext(read("sw.js"), sw);
    const get = async url => { let p = null; handlers.fetch({ request: { url, method: "GET", mode: "no-cors" }, respondWith: x => { p = x; } }); return p ? await p : "not handled"; };
    const r1 = await get(signed("u1/a.jpg", "T1"));
    ok(r1.body === "pic:/storage/v1/object/sign/photos/u1/a.jpg" && net.length === 1 && net[0].o && net[0].o.mode === "cors", "first time: the photo is downloaded once");
    await new Promise(r => setTimeout(r, 5));
    const r2 = await get(signed("u1/a.jpg", "T2-a-new-token"));
    ok(r2.body === r1.body && net.length === 1, "next app open (new token): served from the phone, nothing downloaded");
    await get(signed("u1/a.t.jpg", "T3")); await new Promise(r => setTimeout(r, 5));
    await get(signed("u1/a.t.jpg", "T4"));
    ok(net.length === 2, "the small copy is kept on its own, also once");
    await get(signed("u1/missing.jpg", "T5")); await new Promise(r => setTimeout(r, 5)); await get(signed("u1/missing.jpg", "T6"));
    ok(net.length === 4, "a failed download (expired / not allowed) is not kept");
    ok(await get(`${SB}/rest/v1/catches?select=*`) === "not handled", "live data is not touched");
    ok(stores["fishing-map-photos"] && stores["fishing-map-photos"].m.size === 2, "they live in their own store 'fishing-map-photos'");
    await get(`${SB}/storage/v1/object/sign/avatars/u1/x.jpg?token=1`); await new Promise(r => setTimeout(r, 5)); const n0 = net.length;
    await get(`${SB}/storage/v1/object/sign/avatars/u1/x.jpg?token=2`);
    ok(net.length === n0 && stores["fishing-map-photos"].m.size === 3, "v248: a profile picture is also downloaded once and kept (emptied on sign-out with the photos)");
    stores["fishing-map-v1"] = mkCache("fishing-map-v1");
    let w = null; handlers.activate({ waitUntil: p => { w = p; } }); await w;
    ok(stores["fishing-map-photos"] && !stores["fishing-map-v1"], "an app update keeps the saved photos (old app copies still go)");
  }

  // ---------- 2) js/03: links kept, small copies, upload, backfill, clear ----------
  const s03 = read("js/03-photos.js");
  const block = cut(s03, "  // ---- 💾 Fewer downloads", "  // Shrink a phone photo") + cut(s03, "  // Shrink a phone photo", "  function newId()") + cut(s03, "  async function uploadPhoto(", "  // ---- 📥 Keep a copy") + cut(s03, "  function thumbStrip(", "  // The spot card has two");
  const THUMBS = new Set(["u1/a.jpg", "u2/b.jpg"]);   // photos that already have a small copy
  function ctx(store, who) {
    const asks = [], uploads = [], removed = [], cleared = [], fetched = [];
    const mk = t => ({ tag: t, children: [], handlers: {}, appendChild(c) { this.children.push(c); return c; }, addEventListener(e, f) { this.handlers[e] = f; } });
    let tok = 0;
    const c = {
      console, Date, JSON, Math, Object, Set, Promise, String, Array, Number, setTimeout,
      me: { id: who }, photoUrls: {}, viewerOpened: null, el: (t, cls) => mk(t), document: { createElement: mk },
      openViewer: ph => { c.viewerOpened = ph; }, loadPhotos: async () => {}, newId: () => "n1", photoInfo: async () => ({}),
      createImageBitmap: async b => ({ width: 4000, height: 3000, from: b }),
      localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } },
      window: { caches: { delete: async n => { cleared.push(n); return true; } } },
      fetch: async u => { fetched.push(u); return { ok: true, blob: async () => "FULLBLOB:" + u }; },
      db: { storage: { from: b => ({
        createSignedUrls: async (ps, secs) => { asks.push({ ps, secs }); return { data: ps.map(p => { const full = p.replace(/\.t\.jpg$/, ".jpg"); const has = !/\.t\.jpg$/.test(p) || THUMBS.has(full);
          return has ? { path: p, signedUrl: signed(p, "k" + (++tok)) } : { path: p, signedUrl: null, error: "Either the object does not exist or you do not have permissions" }; }) }; },
        upload: async (p, blob, o) => { uploads.push({ b, p, blob }); if (/\.t\.jpg$/.test(p)) THUMBS.add(p.replace(/\.t\.jpg$/, ".jpg")); return { error: null }; },
        remove: async ps => { removed.push(...ps); return {}; } }) },
        from: () => ({ insert: async () => ({ error: c.insertFails ? { message: "nope" } : null }) }) }
    };
    c.document.createElement = t => { const e = mk(t); if (t === "canvas") { e.getContext = () => ({ drawImage() {} }); e.toBlob = (f, type, q) => f({ w: e.width, h: e.height, q }); } return e; };
    vm.createContext(c);
    vm.runInContext("let photoUrls = this.photoUrls;\n" + block + "\nthis.api = { signPhotos, picUrl, thumbPath, photoCacheClear, thumbBackfill, uploadPhoto, compressImage, thumbStrip, get photoUrls() { return photoUrls; }, get thumbUrls() { return thumbUrls; } };", c);
    return { c, api: c.api, asks, uploads, removed, cleared, fetched };
  }
  const store = {};
  const A = ctx(store, "u1");
  ok(A.api.thumbPath("u1/abc.jpg") === "u1/abc.t.jpg", "the small copy sits next to the photo: u1/abc.jpg → u1/abc.t.jpg (same folder, so the owner can add and delete it)");
  await A.api.signPhotos(["u1/a.jpg", "u1/c.jpg", "u2/b.jpg", "u3/d.jpg", "u1/a.jpg"]);
  ok(A.asks.length === 1 && A.asks[0].secs === 3600 && A.asks[0].ps.length === 8, "one ask for 4 photos + their 4 small copies, 1-hour links (as before)");
  ok(/u1\/a\.t\.jpg/.test(A.api.picUrl("u1/a.jpg")) && /u2\/b\.t\.jpg/.test(A.api.picUrl("u2/b.jpg")), "lists use the small copy when there is one");
  ok(/u1\/c\.jpg/.test(A.api.picUrl("u1/c.jpg")) && /u3\/d\.jpg/.test(A.api.picUrl("u3/d.jpg")), "no small copy yet: the full photo, so nothing looks missing");
  await A.api.signPhotos(["u1/a.jpg", "u1/c.jpg", "u2/b.jpg", "u3/d.jpg"]);
  ok(A.asks.length === 1, "asked again within the hour: links reused, nothing asked");
  const saved = JSON.parse(store["fm-photo-links"]);
  ok(saved.who === "u1" && Object.keys(saved.l).length === 6 && saved.l["f:u1/a.jpg"][1] > Date.now() + 50 * 60000, "links saved on the phone with when they run out");
  const B = ctx(store, "u1");   // the app opened again
  await B.api.signPhotos(["u1/a.jpg", "u2/b.jpg"]);
  ok(B.asks.length === 0, "next app open: the saved links are reused, nothing asked");
  ok(B.api.photoUrls["u1/a.jpg"] === A.api.photoUrls["u1/a.jpg"] && B.api.picUrl("u1/a.jpg") === A.api.picUrl("u1/a.jpg"), "the very same links, so the photo is the same picture");
  const old = JSON.parse(store["fm-photo-links"]); Object.keys(old.l).forEach(k => { old.l[k][1] = Date.now() + 5 * 60000; }); store["fm-photo-links"] = JSON.stringify(old);
  const C = ctx(store, "u1"); await C.api.signPhotos(["u1/a.jpg"]);
  ok(C.asks.length === 1 && C.asks[0].ps.includes("u1/a.jpg") && C.asks[0].ps.includes("u1/a.t.jpg"), "links with under 10 minutes left are asked for again");
  const D = ctx(store, "u9"); await D.api.signPhotos(["u1/a.jpg"]);
  ok(D.asks.length === 1 && !D.api.thumbUrls["u1/c.jpg"], "someone else signed in on this phone: the saved links aren't used");
  // viewer = full photo, strip = small copy
  const strip = A.api.thumbStrip([{ path: "u1/a.jpg" }]);
  ok(/a\.t\.jpg/.test(strip.children[0].src), "photo strips show the small copy");
  ok(/\$\("viewer-img"\)\.src = photoUrls\[ph\.path\] \|\| picUrl\(ph\.path\)/.test(s03), "the viewer opens the full photo");
  // upload: photo + small copy
  const U = ctx({}, "u1");
  await U.api.uploadPhoto("FILE", "s1", null, {}, true);
  ok(U.uploads.length === 2 && U.uploads[0].p === "u1/n1.jpg" && U.uploads[1].p === "u1/n1.t.jpg", "a new photo uploads the photo and its small copy next to it");
  ok(U.uploads[0].blob.w === 1600 && U.uploads[0].blob.q === 0.8 && U.uploads[1].blob.w === 480 && U.uploads[1].blob.q === 0.7, "full photo exactly as before (1600, 0.8); small copy 480 wide, quality 0.7 (~20 KB)");
  U.c.insertFails = true;
  try { await U.api.uploadPhoto("FILE", "s1", null, {}, true); } catch (e) { /* expected */ }
  ok(U.removed.includes("u1/n1.jpg") && U.removed.includes("u1/n1.t.jpg"), "if saving fails, both files are removed again");
  // backfill: my old photo with no small copy gets one; a friend's doesn't
  const F = ctx({}, "u1");
  await F.api.signPhotos(["u1/c.jpg", "u3/d.jpg"]);
  await F.api.thumbBackfill([{ path: "u1/c.jpg", created_by: "u1" }, { path: "u3/d.jpg", created_by: "u3" }]);
  ok(F.uploads.length === 1 && F.uploads[0].p === "u1/c.t.jpg" && F.fetched.length === 1 && /u1\/c\.jpg/.test(F.fetched[0]), "my old photo gets its small copy made on the phone; a friend's photo is left alone");
  ok(/u1\/c\.t\.jpg/.test(F.api.picUrl("u1/c.jpg")), "…and lists use it straight away");
  const many = Array.from({ length: 20 }, (_, i) => ({ path: `u1/old${i}.jpg`, created_by: "u1" }));
  await F.api.signPhotos(many.map(p => p.path)); await F.api.thumbBackfill(many);
  ok(F.uploads.length === 8, "at most 8 per visit (old photos catch up over time)");
  // sign-out / delete account
  const G = ctx(store, "u1"); await G.api.signPhotos(["u1/a.jpg"]);
  await G.api.photoCacheClear();
  ok(!("fm-photo-links" in store) && G.cleared.includes("fishing-map-photos") && !Object.keys(G.api.photoUrls).length && !Object.keys(G.api.thumbUrls).length, "clearing forgets the links and empties the phone's saved photos");
  const s11 = read("js/11-accounts-social.js"), s24 = read("js/24-delete-account.js");
  ok(/async function signOut\(\) \{\s*await db\.auth\.signOut\(\);\s*try \{ await photoCacheClear\(\); \}/.test(s11), "sign-out clears them");
  ok(/async function delLocal\(\)[\s\S]{0,400}photoCacheClear\(\)/.test(s24) && /flatMap\(p => \[p, thumbPath\(p\)\]\)/.test(s24), "account delete clears them and deletes the small copies from storage too");
  const s07 = read("js/07-measure-fishid.js");
  ok(/remove\(rows\.flatMap\(r => \[r\.path, thumbPath\(r\.path\)\]\)\)/.test(s07) && /remove\(\[ph\.path, thumbPath\(ph\.path\)\]\)/.test(s03), "deleting a photo or a catch deletes the small copy too");
  // where small copies are used
  ok(/img\.className = "feed-photo"; img\.src = picUrl\(ph\[0\]\.path\)/.test(read("js/08-feed-plans.js")), "the feed uses the small copy");
  ok(/im\.src = picUrl\(ph\.path\)/.test(read("js/13-groups-misc.js")), "group catch strips use the small copy");
  const s52 = read("js/52-games-more.js");
  ok(/const u = picUrl\(p\.path\)/.test(s52) && /signPhotos\(\[p\.path\]\)/.test(s52) && !/createSignedUrls/.test(s52), "the games use the small copy (signed the same way)");
  ok(/await signPhotos\(\(data \|\| \[\]\)\.map\(x => x\.path\)\)/.test(s11) && !/createSignedUrls/.test(s11.replace(/avatars|createSignedUrl\(/g, "")), "the Public feed signs through the same kept links");
  ok(/photoUrls\[ph\.path\] \? await loadImg\(photoUrls\[ph\.path\]\)/.test(read("js/10-tools-safety.js")) && /if \(ph && photoUrls\[ph\.path\]\) return photoUrls\[ph\.path\]/.test(s07), "share card, Fish ID and measuring still use the full photo");

  console.log(bad ? `${bad} FAILED` : "ALL OK");
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
