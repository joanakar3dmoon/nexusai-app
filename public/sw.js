// sw.js v5 - limpieza total
const CACHE = "nexusai-v5";

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([
      "/nexusai-app/",
      "/nexusai-app/index.html",
    ])).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => {
        console.log("Borrando caché vieja:", k);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  // Solo cachear navegación, siempre red primero
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() => caches.match("/nexusai-app/index.html"))
    );
  }
  // Todo lo demás: red directa, sin caché
});
