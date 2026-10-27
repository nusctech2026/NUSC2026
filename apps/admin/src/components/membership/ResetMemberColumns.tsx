'use client'

import { useState } from 'react'
import { useTableColumns } from '@payloadcms/ui'

export function ResetMemberColumns() {
  const { resetColumnsState } = useTableColumns()
  const [error, setError] = useState(false)

  async function resetColumns() {
    setError(false)
    try {
      await resetColumnsState()
    } catch {
      setError(true)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 12px' }}>
      <button type="button" onClick={resetColumns}>
        Restore member contact columns
      </button>
      {error && <span role="status">Could not restore the default columns. Try reloading the list.</span>}
    </div>
  )
}
