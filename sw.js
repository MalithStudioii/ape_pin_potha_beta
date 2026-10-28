// Ape Pin Potha Service Worker (v109)
// Strategy: Network-First for HTML, JS, CSS to guarantee instant updates; Stale-While-Revalidate for media assets
const CACHE_NAME = 'pin-potha-cache-v109';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/styles.css?v=109',
  './js/app.js?v=109',
  './js/storage.js',
  './js/aranya-data.js',
  './js/security.js',
  './js/algorithm.js',
  './js/sound.js',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/banner.jpg',
  './assets/og-banner.jpg',
  './assets/sangha-frame.png'
];

// Install: Cache critical shell assets and immediately activate
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache addAll warning:', err);
      });
    })
  );
});

// Message listener to trigger immediate update activation
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate: Clean up old caches immediately and take control of all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            }
          })
        );
      })
    ])
  );
});

// Fetch Strategy:
// 1. App Shell (HTML, JS, CSS) -> Network-First (Ensures instant live updates without cache delay)
// 2. Firebase / Google APIs / Media -> Direct Network (Never cache dynamic cloud databases)
// 3. Static Media Assets -> Stale-While-Revalidate (Fast offline + fresh updates in background)
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Bypass non-GET requests and cloud services (Firebase, YouTube, etc.)
  if (request.method !== 'GET') return;
  if (
    url.pathname.includes('google') ||
    url.pathname.includes('admin.html') ||
    url.pathname.includes('admin.js') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('youtube.com') ||
    url.hostname.includes('ytimg.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('cloudflare.com')
  ) {
    return;
  }

  // App Shell (HTML, JS, CSS): Network-First to guarantee latest code and zero update delay
  const isAppShell =
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    request.destination === 'script' ||
    request.destination === 'style' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.html') ||
    url.pathname === '/';

  if (isAppShell) {
    // Ultra-Fast Stale-While-Revalidate: Instant 5ms render from Cache, revalidate in background!
    event.respondWith(
      caches.match(request).then((res) => res || caches.match(request, { ignoreSearch: true })).then((cachedResponse) => {
        const fetchTarget = (request.mode === 'navigate') ? request.url : request;
        const networkFetch = fetch(fetchTarget, { cache: 'no-cache' })
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse || (request.mode === 'navigate' ? caches.match('./index.html') : null));

        return cachedResponse || networkFetch;
      })
    );
    return;
  }

  // Static Media Assets (Images, Icons, Fonts): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
