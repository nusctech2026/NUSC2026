const CACHE_PREFIX = 'nusc-scanner-static-'
const CACHE_NAME = `${CACHE_PREFIX}v2`

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys()
    await Promise.all(names
      .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  const safeStaticAsset = url.origin === self.location.origin
    && (
      url.pathname.startsWith('/_next/static/')
      || url.pathname.startsWith('/icons/')
      || url.pathname === '/images/nusc-crest.png'
    )

  // Never cache pages, auth/session responses, attendance APIs, or candidate data.
  if (!safeStaticAsset) return

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME)
    const cached = await cache.match(request)
    if (cached) return cached

    const response = await fetch(request)
    if (response.ok && response.type === 'basic') {
      await cache.put(request, response.clone())
    }
    return response
  })())
})
