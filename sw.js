// Service Worker dla aplikacji "Elektroniczna Karta Próby Hamulca"

const CACHE_VERSION = 'v1.0.6';   // podbijaj wersję przy każdej zmianie frontendu
const CACHE_NAME = `hamulec-${CACHE_VERSION}`;

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './print.css',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './offline.html' // opcjonalna strona offline
];

// Instalacja – zapisujemy podstawowe pliki w cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Aktywacja – usuwamy stare wersje cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k.startsWith('hamulec-') && k !== CACHE_NAME)
            .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Obsługa żądań – strategia:
// - dla HTML: network-first (aktualne dane), fallback do cache/offline
// - dla innych plików: cache-first
self.addEventListener('fetch', event => {
  const req = event.request;
  const isHTML = req.headers.get('accept')?.includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then(r => r || caches.match('./offline.html'))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return res;
      });
    })
  );
});
