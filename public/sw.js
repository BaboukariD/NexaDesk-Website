// Minimal service worker: makes the app installable and lets the
// quick-capture screen (the one place this genuinely matters — "he
// hears words in class and in the street") open even with no
// connection. Deliberately narrow: this is an authenticated personal
// app, so API responses and most pages are NOT cached — a cache-first
// strategy there risks serving stale data across sessions. Only the
// capture page's own static shell is cached; the actual offline
// queueing of captured words happens in localStorage on the page
// itself (see src/app/capture/page.tsx), not here, since Background
// Sync has poor cross-browser support (notably Safari/iOS, which is
// exactly where this matters most).

const CACHE_NAME = "arabic-app-shell-v1";
const SHELL_URLS = ["/capture", "/manifest.json", "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) return; // never cache API responses

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && SHELL_URLS.includes(url.pathname)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/capture")))
  );
});
