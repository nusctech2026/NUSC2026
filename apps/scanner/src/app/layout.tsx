import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'

export const metadata: Metadata = {
  title: 'NUSC Workforce Scanner',
  description: 'NUSC matchday workforce ID scanner.',
  applicationName: 'NUSC Workforce ID Scanner',
  manifest: '/manifest.webmanifest',
  robots: { index: false, follow: false },
  icons: {
    icon: '/icons/nusc-scanner-192.png',
    apple: '/icons/nusc-scanner-192.png',
  },
  appleWebApp: {
    capable: true,
    title: 'NUSC Scanner',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#102d23',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  )
}
