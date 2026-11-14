import { ScannerApp } from '@/components/ScannerApp'

export const dynamic = 'force-static'

export default function OfflinePage() {
  return (
    <ScannerApp
      matches={[]}
      matchesUnavailable
      staffEmail=""
      offlineShell
    />
  )
}
