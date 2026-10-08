'use client';

import React from 'react';

export const ExportButton: React.FC = () => {
  const handleExport = () => {
    window.location.href = '/api/trial-registrations/export-csv';
  };

  return (
    <div style={{ padding: '0 10px' }}>
      <button
        onClick={handleExport}
        style={{
          padding: '8px 16px',
          backgroundColor: '#000000',
          color: '#ffffff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 500,
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#333333'}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#000000'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export to CSV
      </button>
    </div>
  );
};
