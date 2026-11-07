'use client'

import { createClient } from '@nusc/db/src/client/browser'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError('')

    const supabase = createClient()
    let signInError: Error | null = null
    try {
      const response = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      signInError = response.error
    } catch {
      setPassword('')
      setError('We could not reach the sign-in service. Check your connection and retry.')
      setSubmitting(false)
      return
    }

    if (signInError) {
      setPassword('')
      setError('Email or password is incorrect.')
      setSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/session', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      })

      if (response.status === 403) {
        await supabase.auth.signOut()
        setPassword('')
        setError('This account is not authorized to scan workforce IDs.')
        setSubmitting(false)
        return
      }

      if (!response.ok) {
        await supabase.auth.signOut()
        setPassword('')
        setError(response.status === 401
          ? 'Your sign-in could not be verified. Please try again.'
          : 'We could not verify scanner access. Check your connection and retry.')
        setSubmitting(false)
        return
      }

      setPassword('')
      router.replace('/')
      router.refresh()
    } catch {
      await supabase.auth.signOut()
      setPassword('')
      setError('We could not verify scanner access. Check your connection and retry.')
      setSubmitting(false)
    }
  }

  return (
    <form className="login-form" onSubmit={submit}>
      {error && <div className="form-error" role="alert">{error}</div>}
      <label htmlFor="scanner-email">Staff email</label>
      <input
        id="scanner-email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        disabled={submitting}
      />
      <label htmlFor="scanner-password">Password</label>
      <input
        id="scanner-password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        disabled={submitting}
      />
      <button className="button button-primary login-submit" type="submit" disabled={submitting}>
        {submitting ? <><span className="spinner" aria-hidden="true" /> Verifying access</> : 'Sign in to scanner'}
      </button>
    </form>
  )
}
