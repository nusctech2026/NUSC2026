'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from './actions';
import './dashboard.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar when navigating on mobile
  useEffect(() => {
    // eslint-disable-next-line
    setIsSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="dashboard-layout">
      {/* Mobile Header */}
      <header className="dashboard-mobile-header">
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: '#0f172a' }}>
          <span style={{ width: '24px', height: '24px', display: 'block', background: 'var(--logo) center/contain no-repeat' }}></span>
          <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: '1rem', textTransform: 'uppercase' }}>NUSC Member</span>
        </Link>
        <button onClick={() => setIsSidebarOpen(true)} className="mobile-menu-btn" aria-label="Open Menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </header>

      {/* Overlay */}
      {isSidebarOpen && (
        <div className="dashboard-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar / Nav */}
      <aside className={`dashboard-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <button onClick={() => setIsSidebarOpen(false)} className="sidebar-close-btn" aria-label="Close Menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div className="dashboard-sidebar-header">
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#0f172a' }}>
            <span style={{ width: '32px', height: '32px', display: 'block', background: 'var(--logo) center/contain no-repeat' }}></span>
            <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: '1.2rem', textTransform: 'uppercase' }}>NUSC Member</span>
          </Link>
        </div>

        <nav className="dashboard-nav">
          <ul>
            <li>
              <Link href="/dashboard" style={{ 
                display: 'block', padding: '12px 16px', borderRadius: '8px', 
                background: pathname === '/dashboard' ? '#f1f5f9' : 'transparent',
                color: pathname === '/dashboard' ? 'var(--navy-600)' : '#475569',
                fontWeight: pathname === '/dashboard' ? 600 : 500,
                textDecoration: 'none'
              }}>
                Overview
              </Link>
            </li>
            <li>
              <Link href="/dashboard/tickets" style={{ 
                display: 'block', padding: '12px 16px', borderRadius: '8px', 
                background: pathname === '/dashboard/tickets' ? '#f1f5f9' : 'transparent',
                color: pathname === '/dashboard/tickets' ? 'var(--navy-600)' : '#475569',
                fontWeight: pathname === '/dashboard/tickets' ? 600 : 500,
                textDecoration: 'none'
              }}>
                Match Tickets
              </Link>
            </li>
            <li>
              <Link href="/dashboard/store" style={{ 
                display: 'block', padding: '12px 16px', borderRadius: '8px', 
                background: pathname === '/dashboard/store' ? '#f1f5f9' : 'transparent',
                color: pathname === '/dashboard/store' ? 'var(--navy-600)' : '#475569',
                fontWeight: pathname === '/dashboard/store' ? 600 : 500,
                textDecoration: 'none'
              }}>
                Merchandise Offers
              </Link>
            </li>
          </ul>
        </nav>

        <div className="dashboard-logout">
          <Link href="/" style={{
            display: 'block', padding: '12px 16px', background: 'transparent',
            color: '#64748b', fontWeight: 500, textDecoration: 'none', borderRadius: '8px',
            marginBottom: '4px'
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#f1f5f9')}
          onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}>
            Home
          </Link>
          <button 
            onClick={() => logout()} 
            style={{ 
              width: '100%', padding: '12px 16px', background: 'transparent', 
              border: 'none', textAlign: 'left', color: '#64748b', 
              fontWeight: 500, cursor: 'pointer', borderRadius: '8px' 
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-content-wrapper">
          {children}
        </div>
      </main>
    </div>
  );
}
