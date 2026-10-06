'use client'

import React from 'react'

export const CollectionsView: React.FC = () => {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '1rem', fontWeight: 600 }}>Collections Management</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Curated product collections (Coming Soon in Phase 2).
      </p>
      
      <div style={{ padding: '24px', background: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db', textAlign: 'center' }}>
        <p style={{ color: '#4b5563' }}>Collections functionality requires additional database tables and will be implemented in a future phase.</p>
      </div>
    </div>
  )
}
