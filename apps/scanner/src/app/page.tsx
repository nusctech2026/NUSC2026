import 'server-only'

import { createAdminClient } from '@nusc/db/src/client/admin'
import { redirect } from 'next/navigation'
import { ScannerApp, type ScannerMatch } from '@/components/ScannerApp'
import { getScannerAuthorization } from '@/lib/scanner-auth'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const authorization = await getScannerAuthorization()

  if (authorization.status === 'unauthenticated') redirect('/login')
  if (authorization.status === 'forbidden') redirect('/unauthorized')
  if (authorization.status === 'unavailable') {
    return (
      <main className="notice-page">
        <div className="notice-mark" aria-hidden="true">N</div>
        <p className="eyebrow">NUSC workforce</p>
        <h1>Scanner temporarily unavailable</h1>
        <p>We could not verify your staff access. Check your connection and reload this page.</p>
        <a className="button button-primary" href="/">Reload scanner</a>
      </main>
    )
  }

  let matches: ScannerMatch[] = []
  let matchesUnavailable = false

  try {
    const { data, error } = await createAdminClient()
      .from('campaign_events')
      .select('id, title, start_date, end_date, is_active, is_test')
      .order('start_date', { ascending: false })

    if (error) {
      matchesUnavailable = true
    } else {
      matches = (data ?? []) as ScannerMatch[]
    }
  } catch {
    matchesUnavailable = true
  }

  return (
    <ScannerApp
      matches={matches}
      matchesUnavailable={matchesUnavailable}
      staffEmail={authorization.staff.email}
    />
  )
}
