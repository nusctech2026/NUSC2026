'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { clearActiveStaff } from '@/lib/offline-store'

export function SignOutButton({ compact = false, staffUserId = '' }: { compact?: boolean; staffUserId?: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function signOut() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
      })
      if (!response.ok) {
        setError('Could not sign out. Check your connection and try again.')
        setBusy(false)
        return
      }
    } catch {
      setError('Could not sign out. Check your connection and try again.')
      setBusy(false)
      return
    }

    if (staffUserId) await clearActiveStaff(staffUserId).catch(() => {})

    router.replace('/login')
    router.refresh()
  }

  return (
    <div className="sign-out-control">
      <button
        className={compact ? 'button button-quiet button-compact' : 'button button-secondary'}
        type="button"
        onClick={signOut}
        disabled={busy}
      >
        {busy ? 'Signing out…' : 'Sign out'}
      </button>
      {error && <span className="form-error" role="alert">{error}</span>}
    </div>
  )
}
