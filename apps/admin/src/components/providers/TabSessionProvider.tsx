'use client'

import React, { useEffect, useState } from 'react'

export const TabSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionState, setSessionState] = useState<'checking' | 'allowed' | 'redirecting'>('checking')

  useEffect(() => {
    let active = true

    const checkSession = async () => {
      const isLoginPage = window.location.pathname.endsWith('/login')
      let hasTabSession = false

      try {
        hasTabSession = Boolean(sessionStorage.getItem('tab_session'))
      } catch (err) {
        // Treat inaccessible sessionStorage as a missing tab session (fail closed).
        console.error('Failed to read tab session', err)
      }

      if (!active) return

      if (hasTabSession) {
        setSessionState('allowed')
        return
      }

      // A new tab has no session binding. Clear the shared auth cookie before
      // redirecting, while keeping protected admin views hidden during logout.
      setSessionState('redirecting')
      try {
        await fetch('/api/auth/logout', { method: 'POST' })
      } catch (err) {
        console.error('Failed to clear the tab session', err)
      }

      if (!active) return

      if (isLoginPage) {
        setSessionState('allowed')
        return
      }

      window.location.replace('/admin/login')
    }

    void checkSession()

    return () => {
      active = false
    }
  }, [])

  if (sessionState !== 'allowed') {
    // Do not mount protected views while the tab is being logged out or redirected.
    return null
  }

  return <>{children}</>
}
