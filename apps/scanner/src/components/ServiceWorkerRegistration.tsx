'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Scanning remains online-only if browser policy blocks service workers.
    })
  }, [])

  return null
}
