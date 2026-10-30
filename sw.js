// Fishing Map service worker: keeps a copy of the app on the phone so it opens with no signal.
// - The page itself: try the network first (so updates show up), fall back to the saved copy.
// - Code libraries from CDNs: use the saved copy right away, refresh it in the background.
// - Live data (database, tides, weather) is never cached here. Map tiles are served from the phone only if saved for offline.
// - Catch photos: kept by their storage path (the link's ?token= changes every hour, the photo never does), so each photo is
//   downloaded once per phone. The app empties this on sign-out and account delete.
const CACHE = "fishing-map-v248";
const APP_FILES = ["./", "./index.html", "./privacy.html", "./terms.html", "./css/app.css", "./js/00-icons.js", "./js/01-core.js", "./js/02-spots.js", "./js/03-photos.js", "./js/04-insights.js", "./js/05-seasons-records.js", "./js/06-catching.js", "./js/07-measure-fishid.js", "./js/08-feed-plans.js", "./js/09-map-forecast.js", "./js/10-tools-safety.js", "./js/11-accounts-social.js", "./js/12-contests-alerts.js", "./js/13-groups-misc.js", "./js/14-tank.js", "./js/15-fish-rank.js", "./js/16-fish-race.js", "./js/17-license-help.js", "./js/18-species.js", "./js/19-biting.js", "./js/20-spot-share.js", "./js/21-pub-filters.js", "./js/22-public-water.js", "./js/23-depth.js", "./js/24-delete-account.js", "./js/25-home-map.js", "./js/26-sub-tabs.js", "./js/27-me-find.js", "./js/28-host-pages.js", "./js/29-home-waters.js", "./js/30-red-tide.js", "./js/31-regional-rules.js", "./js/32-spot-style.js", "./js/33-zones.js", "./js/34-official-admin.js", "./js/35-palettes.js", "./js/36-tutorials.js", "./js/37-official-layer.js", "./js/38-admin-powers.js",
  "./js/39-admin-log.js", "./js/40-admin-page.js", "./js/41-admin-people.js", "./js/42-admin-undo.js", "./js/43-admin-warn.js",
  "./js/44-admin-hide.js",
  "./js/45-admin-official.js",
  "./js/47-admin-gated.js",
  "./js/49-terms-banner.js",
  "./js/50-map-full.js",
  "./js/51-games.js",
  "./js/52-games-more.js",
  "./js/53-us-states.js",
  "./js/54-state-agencies.js",
  "./js/55-southeast-seasons.js",
  "./js/56-fishid-training.js",
  "./js/57-fishid-review.js",
  "./js/58-osm-ramps-piers.js",
  "./js/59-us-lakes.js",
  "./js/60-noaa-stations.js",
  "./js/61-state-ramps.js",
  "./js/62-learn.js",
  "./js/63-home.js",
  "./js/64-community.js",
  "./js/65-profile.js",
  "./js/66-page-heads.js",
  "./js/67-today-score.js",
  "./js/68-challenges.js",
  "./js/69-month-calendar.js",
  "./js/70-sightings.js",
  "./js/71-business-pages.js",
  "./js/72-tank-art.js",
  "./js/99-boot.js"];
const CDN_HOSTS = ["cdn.jsdelivr.net", "cdnjs.cloudflare.com"];
const TILE_CACHE = "fishing-map-tiles";   // map tiles the person chose to save for offline (kept across updates)
const CV_CACHE = "fishing-map-cv";        // the ~10 MB OpenCV helper for auto-finding the bill/card (downloaded once, kept across updates)
const TILE_HOSTS = ["tile.openstreetmap.org", "server.arcgisonline.com"];
const PHOTO_CACHE = "fishing-map-photos";  // catch photos + their small copies + profile pictures (kept across updates; emptied on sign-out)
const DATA_CACHE = "fishing-map-data";    // our own data/**/*.json lists (ramps, rules zones, Learn cards): kept on the phone, never re-checked in the background
// A fingerprint per data file (written by tools/data-versions.js from bump.sh): an update drops only the files whose fingerprint changed.
const DATA_VER = {"learn/bait.json":"e92ce61f","learn/fish-pictures.json":"ee557ab4","learn/fish.json":"762b7880","learn/knots.json":"ae65c697","learn/rigs.json":"f4fc351f","ramps/AL.json":"7e746906","ramps/AR.json":"c13c0246","ramps/CO.json":"c1417c04","ramps/CT.json":"500dc55e","ramps/DE.json":"290c9454","ramps/GA.json":"fc4e1430","ramps/IA.json":"da4648f0","ramps/ID.json":"26dd2f44","ramps/IN.json":"e0448de9","ramps/KY.json":"4b484666","ramps/LA.json":"4a967c59","ramps/MA.json":"22c68799","ramps/MD.json":"4f2efd99","ramps/ME.json":"6de59f2f","ramps/MI.json":"9aade4ec","ramps/MN.json":"eb775bad","ramps/MO.json":"c00ec632","ramps/MS.json":"46c86f2a","ramps/MT.json":"f0f4b054","ramps/NC.json":"1b24070a","ramps/NE.json":"8efff3f2","ramps/NH.json":"b552ca65","ramps/NJ.json":"6b27e05c","ramps/NM.json":"b8aaed22","ramps/NY.json":"4712eaf9","ramps/OH.json":"9c437e5b","ramps/OR.json":"5dc22f58","ramps/PA.json":"1ec9fc7f","ramps/RI.json":"a79e5d84","ramps/SC.json":"aef7c801","ramps/TN.json":"7cde8c2a","ramps/TX.json":"39a265c0","ramps/UT.json":"a4b5e610","ramps/VA.json":"e67dc1cb","ramps/VT.json":"8f3af237","ramps/WA.json":"11d4729f","ramps/WI.json":"bc1ccd71","ramps/WV.json":"3d149d39","zones-rules.json":"db9a0bf2"};
const DATA_VER_KEY = "./__data-ver";
const dataName = url => { const i = url.pathname.indexOf("/data/"); return i >= 0 ? url.pathname.slice(i + 6) : null; };
const isData = url => url.origin === self.location.origin && /\/data\/.+\.json$/.test(url.pathname);
// Profile, group and business pictures: kept by path like catch photos (a new picture always gets a new file name)
const PIC_PATH = /\/storage\/v1\/object\/sign\/(photos|avatars|group-avatars|host-avatars)\//;
const PHOTO_KEEP = 800;                     // newest 800 pictures (~ small copies 20 KB, full photos ~300 KB)
const photoKey = url => url.origin + url.pathname;   // the same photo whatever its token
let photoPuts = 0;
function photoTrim(c) {
  if (++photoPuts % 25) return;
  c.keys().then(ks => { if (ks.length > PHOTO_KEEP) ks.slice(0, ks.length - PHOTO_KEEP).forEach(k => c.delete(k)); });
}

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

// Data files that changed in this update (or that the last update didn't list) are dropped, so the new copy is fetched; unchanged ones stay.
async function dataTidy() {
  const c = await caches.open(DATA_CACHE);
  let old = {};
  try { const r = await c.match(DATA_VER_KEY); if (r) old = await r.json(); } catch (e) { /* first time: drop and refetch everything once */ }
  const reqs = await c.keys();
  await Promise.all(reqs.filter(r => { const n = dataName(new URL(r.url)); return n && (!DATA_VER[n] || DATA_VER[n] !== old[n]); }).map(r => c.delete(r)));
  await c.put(DATA_VER_KEY, new Response(JSON.stringify(DATA_VER), { headers: { "Content-Type": "application/json" } }));
}

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== TILE_CACHE && k !== CV_CACHE && k !== PHOTO_CACHE && k !== DATA_CACHE).map(k => caches.delete(k))))
      .then(dataTidy).catch(() => { /* never block the update over this tidy-up */ })
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // The app page and its own css/js files: network first, saved copy when offline
  if (url.origin === self.location.origin && (req.mode === "navigate" || /\.(html|css|js)$/.test(url.pathname) || url.pathname.endsWith("/"))) {
    event.respondWith(
      fetch(req, { cache: "no-cache" }).then(res => { // always check GitHub for a newer version (it's tiny if nothing changed)
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  // Our own data lists (ramps, rules zones, Learn cards): the phone's copy; downloaded only the first time or after an update changed the file
  if (isData(url)) {
    event.respondWith(caches.open(DATA_CACHE).then(c => c.match(req, { ignoreSearch: true }).then(hit => hit ||
      fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }))));
    return;
  }

  // Catch photos and profile / group / business pictures (Supabase signed links): the phone's copy first, otherwise download once and keep it
  if (PIC_PATH.test(url.pathname)) {
    const key = photoKey(url);
    event.respondWith(caches.open(PHOTO_CACHE).then(c => c.match(key).then(hit => hit ||
      fetch(req.url, { mode: "cors", credentials: "omit" }).then(res => {
        if (res.ok && res.status === 200) c.put(key, res.clone()).then(() => photoTrim(c)).catch(() => {});
        return res;
      }).catch(() => fetch(req)))));
    return;
  }

  // Map tiles: only ones saved on purpose ("Save map for offline"); otherwise the normal network request
  if (TILE_HOSTS.includes(url.hostname)) {
    event.respondWith(caches.open(TILE_CACHE).then(c => c.match(req.url)).then(hit => hit || fetch(req)));
    return;
  }

  // OpenCV helper: big, so keep it once and never re-download it in the background
  if (CDN_HOSTS.includes(url.hostname) && url.pathname.includes("opencv-js")) {
    event.respondWith(caches.open(CV_CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }))));
    return;
  }

  // Code libraries: saved copy first, refresh in the background
  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.open(CACHE).then(cache => cache.match(req).then(cached => {
        const fresh = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => cached);
        return cached || fresh;
      }))
    );
  }
});

// Phone alerts: show the alert, and open the right place when it's tapped
self.addEventListener("push", event => {
  let d = {};
  try { d = event.data.json(); } catch (e) { d = { title: "Fishing Map", body: event.data ? event.data.text() : "" }; }
  event.waitUntil(self.registration.showNotification(d.title || "Fishing Map", { body: d.body || "", data: { url: d.url || "./" } }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "./";
  const qi = url.indexOf("?");   // accepts "?go=…" and "./?go=…"
  const go = qi >= 0 ? url.slice(qi) : "";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    const c = list.find(x => x.url.startsWith(self.registration.scope));
    if (c) { c.postMessage({ go }); return c.focus(); }
    return self.clients.openWindow(self.registration.scope + go);
  }));
});
