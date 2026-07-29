const CACHE = 'shuttle-pulse-flat-landmarks-v6';
const APP_SHELL = [
  "./",
  "./index.html",
  "./driver.html",
  "./admin.html",
  "./login.html",
  "./shuttle-manifest.json",
  "./shuttle-components.css",
  "./student-map.css",
  "./driver-console.css",
  "./operations-dashboard.css",
  "./team-login.css",
  "./shuttle-maps-config.js",
  "./shuttle-core.js",
  "./shuttle-data-store.js",
  "./shuttle-network.js",
  "./campus-landmarks-data.js",
  "./campus-landmarks.js",
  "./user-location.js",
  "./live-shuttles.js",
  "./service-reports.js",
  "./trip-recommendations.js",
  "./student-map.js",
  "./driver-console.js",
  "./operations-dashboard.js",
  "./team-auth.js",
  "./shuttle-logo-mark.svg",
  "./shuttle-app-icon.svg",
  "./shuttle-app-icon-192.png",
  "./shuttle-app-icon-512.png",
  "./shuttle-vehicle.svg",
  "./shuttle-stop.svg",
  "./shuttle-warning.svg",
  "./shuttle-user-location.svg"
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
  );
});
