// NEDVI OS: Do not cache build-fingerprinted Next.js assets.
// HTML from a different deployment must fetch matching CSS/JS from the network.
const CACHE_NAME = 'nedvi-os-static-v7'
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
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: 'NEDVI_SW_ACTIVATED' })
        }
      })
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


// Browser-managed Web Push is delivered even when no NEDVI OS tab is open.
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let message = {}
    try {
      message = event.data ? event.data.json() : {}
    } catch {
      message = { body: event.data ? event.data.text() : '' }
    }
    const title = typeof message.title === 'string' ? message.title.slice(0, 100) : 'NEDVI OS'
    const body = typeof message.body === 'string' ? message.body.slice(0, 300) : 'Hay una actividad nueva.'
    const path = typeof message.path === 'string' &&
      message.path.startsWith('/') && !message.path.startsWith('//')
      ? message.path : '/dashboard'
    await self.registration.showNotification(title, {
      body, icon: '/icon.png', badge: '/icon.png',
      tag: typeof message.id === 'string' ? 'nedvi-event-' + message.id : 'nedvi-event',
      data: { path },
    })
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil((async () => {
    const path = event.notification.data?.path || '/dashboard'
    const target = new URL(path, self.location.origin)
    if (target.origin !== self.location.origin) return
    const openTabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const tab of openTabs) {
      if (new URL(tab.url).origin === target.origin) {
        await tab.navigate(target.href)
        await tab.focus()
        return
      }
    }
    await self.clients.openWindow(target.href)
  })())
})
