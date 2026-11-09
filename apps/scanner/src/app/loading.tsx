import { NuscLogo } from '@/components/NuscLogo'

export default function Loading() {
  return (
    <main className="loading-page" role="status" aria-live="polite" aria-busy="true">
      <NuscLogo className="loading-logo" alt="Nagaland United Sports Club crest" />
      <span className="loading-indicator" aria-hidden="true" />
      <p>Loading workforce scanner</p>
    </main>
  )
}
