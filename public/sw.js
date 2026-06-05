// This is a basic service worker.
// It's required for the app to be installable (PWA).

self.addEventListener('install', (event) => {
  console.log('Service Worker: I am installed');
  // Skip waiting to activate the new service worker immediately.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: I am activated');
  // Take control of all pages immediately.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // This service worker doesn't intercept fetch requests.
  // It's just here to make the app installable.
  // We can add caching logic here later.
});
