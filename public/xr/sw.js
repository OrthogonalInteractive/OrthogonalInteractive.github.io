// Serves the vendored hand-tracking assets out of Cache Storage. MediaPipe
// fetches its WASM and model by URL from inside its own loader, so the page
// cannot hand it cached bytes directly — this worker is what makes the stored
// copies reachable. Everything outside /xr/mediapipe/ passes straight through.
const CACHE = 'oi-hand-v1'
const PREFIX = '/xr/mediapipe/'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin || !url.pathname.startsWith(PREFIX)) return

  event.respondWith(
    caches
      .open(CACHE)
      .then((cache) => cache.match(event.request.url))
      .then((hit) => hit ?? fetch(event.request)),
  )
})
