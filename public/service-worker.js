const CACHE_NAME = "schengen-days-v6";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Stale-while-revalidate: serve dalla cache se disponibile, aggiorna in background.
// Se offline e la risorsa non è in cache, per le navigazioni si torna alla pagina principale.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      if (cached) return cached;

      const fresh = await networkFetch;
      if (fresh) return fresh;

      if (event.request.mode === "navigate") {
        const fallback = await cache.match(self.registration.scope);
        if (fallback) return fallback;
      }
      return new Response("Offline e risorsa non disponibile in cache.", { status: 503 });
    })
  );
});
