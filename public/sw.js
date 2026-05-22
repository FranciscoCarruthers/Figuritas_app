const CACHE_NAME = 'figuritas-2026-v5'
const STATIC_ASSETS = [
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
]
const CACHEABLE_PREFIXES = [
  '/_next/static/',
  '/stickers/',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return
  const shouldCache = STATIC_ASSETS.includes(url.pathname) ||
    CACHEABLE_PREFIXES.some(prefix => url.pathname.startsWith(prefix))

  if (!shouldCache) return

  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) return cached

        return fetch(request).then(response => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy))
          return response
        })
      })
  )
})

self.addEventListener('push', event => {
  let payload = {
    title: 'FiguritasApp',
    body: 'Tenes una novedad en el album.',
    url: '/',
    tag: 'figuritasapp',
  }

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() }
    } catch {
      payload.body = event.data.text()
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: payload.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        for (const client of clients) {
          if ('focus' in client && client.url === targetUrl) return client.focus()
        }

        if (self.clients.openWindow) return self.clients.openWindow(targetUrl)
        return undefined
      })
  )
})
