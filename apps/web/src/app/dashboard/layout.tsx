'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from './actions';
import './dashboard.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

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
      <aside className={`dashboard-sidebar ${isSidebarOpen ? 'open' : ''} ${isDesktopCollapsed ? 'collapsed' : ''}`}>
        <button onClick={() => setIsSidebarOpen(false)} className="sidebar-close-btn" aria-label="Close Menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div className="dashboard-sidebar-header">
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#0f172a', overflow: 'hidden' }}>
            <span style={{ width: '32px', height: '32px', display: 'block', background: 'var(--logo) center/contain no-repeat', flexShrink: 0 }}></span>
            <span className="sidebar-text" style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: '1.2rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>NUSC Member</span>
          </Link>
          <button 
            className="desktop-collapse-btn" 
            onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
            aria-label="Toggle Sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </button>
        </div>

        <nav className="dashboard-nav">
          <ul>
            <li>
              <Link href="/dashboard" className="nav-link" style={{ 
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', 
                background: pathname === '/dashboard' ? '#f1f5f9' : 'transparent',
                color: pathname === '/dashboard' ? 'var(--navy-600)' : '#475569',
                fontWeight: pathname === '/dashboard' ? 600 : 500,
                textDecoration: 'none', overflow: 'hidden', whiteSpace: 'nowrap'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                <span className="sidebar-text">Overview</span>
              </Link>
            </li>
            <li>
              <Link href="/dashboard/tickets" className="nav-link" style={{ 
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', 
                background: pathname === '/dashboard/tickets' ? '#f1f5f9' : 'transparent',
                color: pathname === '/dashboard/tickets' ? 'var(--navy-600)' : '#475569',
                fontWeight: pathname === '/dashboard/tickets' ? 600 : 500,
                textDecoration: 'none', overflow: 'hidden', whiteSpace: 'nowrap'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}><rect x="2" y="8" width="20" height="8" rx="2" ry="2"></rect><path d="M2 12A2 2 0 0 1 2 12"></path><path d="M22 12A2 2 0 0 1 22 12"></path></svg>
                <span className="sidebar-text">Match Tickets</span>
              </Link>
            </li>
            <li>
              <Link href="/dashboard/store" className="nav-link" style={{ 
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', 
                background: pathname === '/dashboard/store' ? '#f1f5f9' : 'transparent',
                color: pathname === '/dashboard/store' ? 'var(--navy-600)' : '#475569',
                fontWeight: pathname === '/dashboard/store' ? 600 : 500,
                textDecoration: 'none', overflow: 'hidden', whiteSpace: 'nowrap'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                <span className="sidebar-text">Merchandise Offers</span>
              </Link>
            </li>
          </ul>
        </nav>

        <div className="dashboard-logout">
          <Link href="/" className="nav-link" style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'transparent',
            color: '#64748b', fontWeight: 500, textDecoration: 'none', borderRadius: '8px',
            marginBottom: '4px', overflow: 'hidden', whiteSpace: 'nowrap'
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#f1f5f9')}
          onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            <span className="sidebar-text">Home</span>
          </Link>
          <button 
            className="nav-link"
            onClick={() => logout()} 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px', background: 'transparent', 
              border: 'none', textAlign: 'left', color: '#64748b', 
              fontWeight: 500, cursor: 'pointer', borderRadius: '8px', overflow: 'hidden', whiteSpace: 'nowrap' 
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            <span className="sidebar-text">Log Out</span>
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
