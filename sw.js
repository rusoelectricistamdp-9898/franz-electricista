/* ============================================
   FRANZ ELECTRICIDAD PRO — SERVICE WORKER
   - Permite instalar la app (PWA) y usarla offline
   - Estrategia "network-first": si hay internet, siempre
     trae la versión más nueva y la deja cacheada; si no
     hay internet, sirve la última versión guardada.
   - Subís una actualización → cambiás CACHE_VERSION → a los
     usuarios se les actualiza sola la próxima vez que abren
     la app con internet (sin pasar por ninguna tienda).
============================================ */

const CACHE_VERSION = "franz-pro-v1";
const ARCHIVOS_APP = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./js/supabase-config.js",
  "./js/auth.js",
  "./js/fotos.js",
  "./js/app.js",
  "./js/materiales-db.js",
  "./js/sync.js",
  "./js/admin.js",
  "./js/perfil.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ARCHIVOS_APP))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(nombres.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // network-first: intenta traer lo último; si no hay red, usa el cache
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copia = res.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, copia));
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
  );
});
