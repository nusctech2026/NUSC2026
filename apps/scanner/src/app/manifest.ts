import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'NUSC Workforce ID Scanner',
    short_name: 'NUSC Scanner',
    description: 'Scan approved workforce IDs and record matchday attendance.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait',
    background_color: '#f1f4ef',
    theme_color: '#102d23',
    categories: ['business', 'utilities'],
    icons: [
      {
        src: '/icons/nusc-scanner-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/nusc-scanner-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/nusc-scanner-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
