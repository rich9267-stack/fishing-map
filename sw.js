// Fishing Map service worker: keeps a copy of the app on the phone so it opens with no signal.
// - The page itself: try the network first (so updates show up), fall back to the saved copy.
// - Code libraries from CDNs: use the saved copy right away, refresh it in the background.
// - Live data (database, tides, weather, map tiles) is never cached here.
const CACHE = "fishing-map-v2";
const APP_FILES = ["./", "./index.html", "./privacy.html"];
const CDN_HOSTS = ["cdn.jsdelivr.net", "cdnjs.cloudflare.com"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // The app page: network first, saved copy when offline
  if (url.origin === self.location.origin && (req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/"))) {
    event.respondWith(
      fetch(req, { cache: "no-cache" }).then(res => { // always check GitHub for a newer version (it's tiny if nothing changed)
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
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
