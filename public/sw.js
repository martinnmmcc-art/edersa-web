// Service worker para EDERSA Red MT.
//
// v2: cambia de "cache-first" a "network-first". Con cache-first, cada
// deploy nuevo podía quedar invisible para el celular hasta que el
// cache se venciera solo — el navegador seguía sirviendo JS viejo
// aunque Vercel ya tuviera el fix. Ahora: si hay conexión, siempre pide
// la versión más nueva al servidor; el cache solo se usa como
// respaldo cuando no hay internet.
//
// El cambio de nombre de CACHE_NAME (v1 -> v2) además fuerza a que se
// borre TODO lo que había cacheado con la estrategia vieja.

const CACHE_NAME = "edersa-shell-v2";
const SHELL_URLS = ["/mapa", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (
    request.url.includes("supabase.co") ||
    request.url.includes("openfreemap.org") ||
    request.url.includes("arcgisonline.com") ||
    request.url.includes("opentopomap.org") ||
    request.url.startsWith("ws")
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
