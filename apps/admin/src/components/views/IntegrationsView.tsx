'use client'

import React, { useEffect, useState } from 'react'

export const IntegrationsView: React.FC = () => {
  const [integrations, setIntegrations] = useState([
    {
      id: 'razorpay',
      name: 'Razorpay',
      description: 'Payment gateway for India',
      status: 'active',
      type: 'payment',
    },
    {
      id: 'supabase_auth',
      name: 'Supabase Auth',
      description: 'Authentication and session management',
      status: 'active',
      type: 'auth',
    },
    {
      id: 'payload_cms',
      name: 'Payload CMS',
      description: 'Headless content management',
      status: 'active',
      type: 'cms',
    }
  ])

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '1rem', fontWeight: 600 }}>Integrations & Services</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Manage third-party integrations and internal services.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {integrations.map(integration => (
          <div key={integration.id} style={{ padding: '1.5rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 0.25rem 0' }}>{integration.name}</h3>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', fontWeight: 600 }}>{integration.type}</span>
              </div>
              <span style={{ 
                background: integration.status === 'active' ? '#dcfce7' : '#f3f4f6', 
                color: integration.status === 'active' ? '#166534' : '#374151', 
                padding: '4px 8px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 
              }}>
                {integration.status.toUpperCase()}
              </span>
            </div>
            <p style={{ color: '#4b5563', fontSize: '0.875rem', margin: 0, flexGrow: 1 }}>{integration.description}</p>
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
              <button style={{ background: '#f9fafb', border: '1px solid #d1d5db', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', width: '100%' }}>
                Configure
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
