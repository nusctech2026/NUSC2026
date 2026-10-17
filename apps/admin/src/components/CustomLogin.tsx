'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export const CustomLogin: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
          body: JSON.stringify({ email, password, portal: 'staff' }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Login failed')
      }

      sessionStorage.setItem('tab_session', 'active')
      router.replace('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 20, border: '1px solid #ccc', borderRadius: 8, background: '#fff' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 20, color: '#000' }}>Staff Login</h2>
      {error && <div style={{ color: 'red', marginBottom: 20, textAlign: 'center' }}>{error}</div>}
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          required
          style={{ padding: 10, borderRadius: 4, border: '1px solid #ddd', color: '#000', background: '#fff' }}
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          required 
          style={{ padding: 10, borderRadius: 4, border: '1px solid #ddd', color: '#000', background: '#fff' }}
        />
        <button 
          type="submit" 
          disabled={loading}
          style={{ padding: 10, borderRadius: 4, background: '#000', color: '#fff', cursor: 'pointer', border: 'none' }}
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 18, color: '#555' }}>
        Campaign staff? <Link href="/campaign-login">Use campaign sign-in</Link>
      </p>
    </div>
  )
}
