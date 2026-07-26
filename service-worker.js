const CACHE_NAME = 'shuttle-pulse-v2-google-maps';
const APP_SHELL = [
  './', './index.html', './driver.html', './admin.html', './login.html',
  './manifest.json',
  './css/components.css', './css/map.css', './css/driver.css', './css/admin.css',
  './js/utils.js', './js/firebase-config.js', './js/map.js', './js/shuttle-markers.js',
  './js/location.js', './js/stops.js', './js/reports.js', './js/recommendations.js',
  './js/driver.js', './js/admin.js', './js/auth.js',
  './assets/icons/shuttle.svg', './assets/icons/bus-stop.svg', './assets/icons/user-location.svg', './assets/icons/warning.svg',
  './assets/logo/logo-mark.svg', './assets/logo/logo-wordmark.svg', './assets/logo/app-icon.svg',
  './assets/logo/app-icon-192.png', './assets/logo/app-icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Google Maps is always fetched from Google. The app shell remains available
  // offline, but live map tiles and scripts require a connection.
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => {
      if (event.request.mode === 'navigate') return caches.match('./index.html');
      return new Response('', { status: 503, statusText: 'Offline' });
    }))
  );
});
