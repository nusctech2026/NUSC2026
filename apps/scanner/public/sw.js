const CACHE_PREFIX = 'nusc-scanner-static-'
const CACHE_NAME = `${CACHE_PREFIX}v3`
const OFFLINE_PATH = '/offline'

async function cacheOfflineShell() {
  const cache = await caches.open(CACHE_NAME)
  const shellUrl = new URL(OFFLINE_PATH, self.location.origin)
  const response = await fetch(new Request(shellUrl, {
    method: 'GET',
    credentials: 'omit',
    cache: 'reload',
    headers: { Accept: 'text/html' },
  }))
  if (!response.ok || response.type !== 'basic') throw new Error('Offline scanner shell is unavailable.')

  await cache.put(shellUrl, response.clone())
  const html = await response.clone().text()
  const assetPaths = new Set()
  for (const match of html.matchAll(/(?:src|href)=["']([^"']*\/_next\/static\/[^"']+)["']/g)) {
    try {
      const asset = new URL(match[1].replaceAll('&amp;', '&'), self.location.origin)
      if (asset.origin === self.location.origin && asset.pathname.startsWith('/_next/static/')) assetPaths.add(asset.href)
    } catch {
      // Ignore malformed or external references in the public shell.
    }
  }

  await Promise.all([...assetPaths].map(async (assetUrl) => {
    try {
      const assetResponse = await fetch(new Request(assetUrl, { credentials: 'omit', cache: 'reload' }))
      if (assetResponse.ok && assetResponse.type === 'basic') await cache.put(assetUrl, assetResponse)
    } catch {
      // The cached shell remains useful when optional assets fail to preload.
    }
  }))
  return assetPaths.size
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    await cacheOfflineShell()
    await self.skipWaiting()
  })())
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

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'PREPARE_OFFLINE_SHELL') return
  event.waitUntil((async () => {
    try {
      const assets = await cacheOfflineShell()
      event.ports[0]?.postMessage({ success: true, assets })
    } catch {
      event.ports[0]?.postMessage({ success: false, error: 'Offline scanner page could not be cached.' })
    }
  })())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate' && (url.pathname === '/' || url.pathname === OFFLINE_PATH)) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request)
        if (response.status < 500) return response
      } catch {
        // Fall back to the public scanner shell when the server is unreachable.
      }
      const cache = await caches.open(CACHE_NAME)
      return await cache.match(OFFLINE_PATH) || Response.error()
    })())
    return
  }

  const safeStaticAsset = url.pathname.startsWith('/_next/static/')
    || url.pathname.startsWith('/icons/')
    || url.pathname === '/images/nusc-crest.png'

  // Never cache pages, auth/session responses, attendance APIs, or candidate data.
  if (!safeStaticAsset) return

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME)
    const cached = await cache.match(request)
    if (cached) return cached

    const response = await fetch(request)
    if (response.ok && response.type === 'basic') await cache.put(request, response.clone())
    return response
  })())
})
