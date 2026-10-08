// NEDVI OS: Do not cache build-fingerprinted Next.js assets.
// HTML from a different deployment must fetch matching CSS/JS from the network.
const CACHE_NAME = 'nedvi-os-static-v5'
const STATIC_ASSETS = ['/icon.png', '/logo-blanco.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Never serve deployment-specific Next.js assets from an old Service Worker cache.
  if (url.pathname.startsWith('/_next/')) return

  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    )
  }
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
