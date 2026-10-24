// Fishing Map service worker: keeps a copy of the app on the phone so it opens with no signal.
// - The page itself: try the network first (so updates show up), fall back to the saved copy.
// - Code libraries from CDNs: use the saved copy right away, refresh it in the background.
// - Live data (database, tides, weather) is never cached here. Map tiles are served from the phone only if saved for offline.
// - Catch photos: kept by their storage path (the link's ?token= changes every hour, the photo never does), so each photo is
//   downloaded once per phone. The app empties this on sign-out and account delete.
const CACHE = "fishing-map-v194";
const APP_FILES = ["./", "./index.html", "./privacy.html", "./terms.html", "./css/app.css", "./js/01-core.js", "./js/02-spots.js", "./js/03-photos.js", "./js/04-insights.js", "./js/05-seasons-records.js", "./js/06-catching.js", "./js/07-measure-fishid.js", "./js/08-feed-plans.js", "./js/09-map-forecast.js", "./js/10-tools-safety.js", "./js/11-accounts-social.js", "./js/12-contests-alerts.js", "./js/13-groups-misc.js", "./js/14-tank.js", "./js/15-fish-rank.js", "./js/16-fish-race.js", "./js/17-license-help.js", "./js/18-species.js", "./js/19-biting.js", "./js/20-spot-share.js", "./js/21-pub-filters.js", "./js/22-public-water.js", "./js/23-depth.js", "./js/24-delete-account.js", "./js/25-home-map.js", "./js/26-sub-tabs.js", "./js/27-me-find.js", "./js/28-host-pages.js", "./js/29-home-waters.js", "./js/30-red-tide.js", "./js/31-regional-rules.js", "./js/32-spot-style.js", "./js/33-zones.js", "./js/34-official-admin.js", "./js/35-palettes.js", "./js/36-tutorials.js", "./js/37-official-layer.js", "./js/38-admin-powers.js",
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
  "./js/99-boot.js"];
const CDN_HOSTS = ["cdn.jsdelivr.net", "cdnjs.cloudflare.com"];
const TILE_CACHE = "fishing-map-tiles";   // map tiles the person chose to save for offline (kept across updates)
const CV_CACHE = "fishing-map-cv";        // the ~10 MB OpenCV helper for auto-finding the bill/card (downloaded once, kept across updates)
const TILE_HOSTS = ["tile.openstreetmap.org", "server.arcgisonline.com"];
const PHOTO_CACHE = "fishing-map-photos";  // catch photos + their small copies (kept across updates; emptied on sign-out)
const DATA_CACHE = "fishing-map-data";    // data/ramps/<ST>.json: each state agency's ramp list (kept across updates; shown at once, refreshed in the background)
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

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== TILE_CACHE && k !== CV_CACHE && k !== PHOTO_CACHE && k !== DATA_CACHE).map(k => caches.delete(k))))
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

  // State ramp lists (our own files): the phone's copy first, a fresh one fetched behind it for next time
  if (url.origin === self.location.origin && /\/data\/(ramps\/[A-Z]{2}|zones-rules|learn\/(fish|knots|rigs|bait))\.json$/.test(url.pathname)) {
    event.respondWith(caches.open(DATA_CACHE).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; });
      return hit || net;
    })));
    return;
  }

  // Catch photos (Supabase signed links): the phone's copy first, otherwise download once and keep it
  if (url.pathname.includes("/storage/v1/object/sign/photos/")) {
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
