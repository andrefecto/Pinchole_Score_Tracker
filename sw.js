const CACHE_NAME = 'pinochle-scorer-v1';
const BASE_PATH = '/Pinchole_Score_Tracker';
const APP_ASSETS = [
  BASE_PATH + '/',
  BASE_PATH + '/index.html',
  BASE_PATH + '/css/styles.css',
  BASE_PATH + '/js/constants.js',
  BASE_PATH + '/js/game-state.js',
  BASE_PATH + '/js/ui-controller.js',
  BASE_PATH + '/js/cloud-save.js',
  BASE_PATH + '/js/app.js',
  BASE_PATH + '/icons/icon-192.svg',
  BASE_PATH + '/icons/icon-512.svg',
  BASE_PATH + '/privacy.html',
];

// Install: cache app assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for app assets, network-first for external (Google Identity Services)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip caching for Google Identity Services and other external scripts
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for local assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
