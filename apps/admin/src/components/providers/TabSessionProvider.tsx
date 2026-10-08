'use client'

import React, { useEffect, useState } from 'react'

export const TabSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const tabSession = sessionStorage.getItem('tab_session')
        
        if (!tabSession) {
          // Empty sessionStorage means new tab. We must logout from the backend to clear the shared cookie
          await fetch('/api/auth/logout', { method: 'POST' })
          
          if (!window.location.pathname.endsWith('/login')) {
            window.location.href = '/admin/login'
            return // Stop execution, let the browser navigate
          }
        }
      } catch (err) {
        console.error('Failed to check tab session', err)
      } finally {
        setIsReady(true)
      }
    }

    checkSession()
  }, [])

  if (!isReady) {
    // Avoid rendering the admin UI with valid cookies if we are about to log them out
    return null
  }

  return <>{children}</>
}
