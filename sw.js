const CACHE_VERSION = "aqua-pc-parts-v10";
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/deals.html",
  "/used-parts.html",
  "/brand-new-parts.html",
  "/catalog.html",
  "/pc-builder.html",
  "/builds.html",
  "/trade-in.html",
  "/contact.html",
  "/studio-3d.html",
  "/ai-studio.html",
  "/shop.css",
  "/styles.css",
  "/auth-panel.css",
  "/catalog.js",
  "/part-images.js",
  "/shell.js",
  "/shop.js",
  "/app.js",
  "/aqua-auth.bundle.js",
  "/studio-3d.bundle.js",
  "/maps-locator.bundle.js",
  "/ai-studio.bundle.js",
  "/pwa.js",
  "/manifest.json",
  "/assets/logo.jpg",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/apple-touch-icon.png",
];

// Never intercept Firebase Auth / Firestore / App Check / reCAPTCHA / Google Maps traffic
const BYPASS_HOSTS = [
  "firestore.googleapis.com",
  "identitytoolkit.googleapis.com",
  "securetoken.googleapis.com",
  "firebaseappcheck.googleapis.com",
  "accounts.google.com",
  "apis.google.com",
  "www.googleapis.com",
  "www.google.com",
  "www.gstatic.com",
  "recaptcha.net",
  "maps.googleapis.com",
  "maps.gstatic.com",
  "routes.googleapis.com",
  "places.googleapis.com",
  "firebaseapp.com",
  "firebaseinstallations.googleapis.com",
  "facebook.com",
  "graph.facebook.com",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL_ASSETS.map((url) => new Request(url, { cache: "reload" }))))
      .catch(() => { })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (BYPASS_HOSTS.some((h) => url.hostname.includes(h))) return;
  if (url.pathname.startsWith("/__/")) return;
  if (url.pathname.startsWith("/api/")) {
    // Network-first for live catalog API
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // Google Fonts: Cache-first
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  // Same-origin navigations: Network-first with cached HTML fallback
  if (req.mode === "navigate" && url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match("/index.html")))
    );
    return;
  }

  // Same-origin static assets: Stale-While-Revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const net = fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || net;
      })
    );
  }
});
