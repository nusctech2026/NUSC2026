'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function CampaignLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, portal: 'campaign' }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Sign in failed.')
      sessionStorage.setItem('tab_session', 'active')
      router.replace('/admin/campaign')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign in failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f3f5f8' }}>
      <section style={{ width: '100%', maxWidth: 440, padding: 32, border: '1px solid #d9e0ea', borderRadius: 12, background: '#fff' }}>
        <p style={{ margin: 0, color: '#527044', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>NUSC Campaign</p>
        <h1 style={{ margin: '10px 0 8px', color: '#111827', fontSize: 28 }}>Campaign staff sign in</h1>
        <p style={{ margin: '0 0 24px', color: '#596579' }}>Use your campaign manager, reviewer, or gate staff account.</p>
        {error && <p role="alert" style={{ padding: 12, color: '#991b1b', background: '#fee2e2', borderRadius: 8 }}>{error}</p>}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          <label style={{ display: 'grid', gap: 6, color: '#182337', fontWeight: 600 }}>
            Email
            <input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} style={{ padding: 12, border: '1px solid #cbd5e1', borderRadius: 7 }} />
          </label>
          <label style={{ display: 'grid', gap: 6, color: '#182337', fontWeight: 600 }}>
            Password
            <input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} style={{ padding: 12, border: '1px solid #cbd5e1', borderRadius: 7 }} />
          </label>
          <button type="submit" disabled={loading} style={{ padding: 12, border: 0, borderRadius: 7, background: '#14532d', color: '#fff', fontWeight: 700, cursor: loading ? 'wait' : 'pointer' }}>
            {loading ? 'Signing in…' : 'Sign in to campaign tools'}
          </button>
        </form>
        <p style={{ margin: '20px 0 0', color: '#596579' }}>General staff? <Link href="/admin/login">Use the main staff sign-in</Link></p>
      </section>
    </main>
  )
}
