/* ============================================
   FRANZ ELECTRICISTA — SERVICE WORKER
   - Permite instalar la app (PWA) y usarla SIN SEÑAL.
   - Estrategia "cache-first, actualiza atrás": muestra
     al toque lo que ya tiene guardado (rápido y confiable
     con poca señal), y de paso busca una versión más nueva
     en segundo plano para la próxima vez que abras la app.
   - Las llamadas a Supabase (datos en la nube) NUNCA se
     cachean acá — se dejan pasar directo, y si fallan por
     falta de señal, la propia app maneja el "modo offline"
     (guarda todo local y sincroniza cuando vuelva la señal).
   - Subís una actualización → cambiás CACHE_VERSION → a los
     usuarios se les actualiza sola la próxima vez que abren
     la app con internet (sin pasar por ninguna tienda).
============================================ */

const CACHE_VERSION = "franz-pro-v2";

const ARCHIVOS_APP = [
  "./",
  "./index.html",
  "./landing.html",
  "./descargar.html",
  "./style.css",
  "./manifest.json",
  "./js/supabase-config.js",
  "./js/auth.js",
  "./js/auditoria.js",
  "./js/fotos.js",
  "./js/app.js",
  "./js/materiales-db.js",
  "./js/sync.js",
  "./js/admin.js",
  "./js/perfil.js",
  "./icons/icon-192.png",
  "./icons/icon-256.png",
  "./icons/icon-384.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/favicon-32.png",
  "./icons/apple-touch-icon.png",
];

// Librerías externas (CDN) de las que depende la app para arrancar —
// si esto no está guardado, la app se rompe entera sin señal.
const ARCHIVOS_CDN = [
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js",
  "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      // Los archivos propios: si alguno falla, que se note (evita quedar
      // con una versión a medias guardada)
      await cache.addAll(ARCHIVOS_APP);
      // Los archivos de CDN los guardamos aparte, sin frenar la instalación
      // si por algún motivo uno falla justo en este momento
      await Promise.all(
        ARCHIVOS_CDN.map((url) =>
          fetch(url, { mode: "cors" })
            .then((res) => { if (res && res.ok) cache.put(url, res); })
            .catch(() => {})
        )
      );
    })
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

  const url = new URL(req.url);

  // Nunca interceptamos las llamadas a Supabase (datos en vivo, login, etc.)
  // Se dejan pasar directo — si fallan por falta de señal, es la propia app
  // (sync.js) la que maneja el modo offline correctamente, no el Service Worker.
  if (url.hostname.endsWith(".supabase.co")) return;

  // Para todo lo demás (la app en sí + las librerías de CDN):
  // cache-first — responde al toque con lo guardado, y en paralelo busca
  // una versión más nueva para la próxima vez.
  event.respondWith(
    caches.match(req).then((cached) => {
      const actualizarEnSegundoPlano = fetch(req, req.mode === "navigate" ? {} : { mode: "cors" })
        .then((res) => {
          if (res && (res.ok || res.type === "opaque")) {
            const copia = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copia));
          }
          return res;
        })
        .catch(() => null);

      // Si ya lo teníamos guardado, lo servimos ya mismo (rápido, confiable sin señal)
      if (cached) return cached;

      // Si no lo teníamos, esperamos la red; si tampoco hay red, mostramos
      // al menos el shell de la app en vez de una pantalla rota
      return actualizarEnSegundoPlano.then((res) => res || caches.match("./index.html"));
    })
  );
});
