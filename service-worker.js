const CACHE = "feira-cache-v4";

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll([
      "./",
      "./index.html",
      "./style.css",
      "./app.js",
      "./manifest.json",
      "./icon.svg"
    ]))
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => key !== CACHE ? caches.delete(key) : null)
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  e.respondWith(
    fetch(e.request)
      .then(response => {
        return caches.open(CACHE).then(cache => {
          cache.put(e.request, response.clone());
          return response;
        });
      })
      .catch(() => caches.match(e.request))
  );
});
