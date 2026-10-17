import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/sections/Nav';
import { Footer } from '@/components/sections/Footer';
import './campaign.css';

export const metadata: Metadata = {
  title: 'Campaign Registration | Nagaland United Sports Club',
  description:
    'Join Nagaland United Sports Club matchday operations. Register for Ahibi Ticketing, Matchday Volunteers, or Technical Production Crew.',
};

export default function CampaignLandingPage() {
  return (
    <>
      <Nav theme="light" forceScrolled={true} />
      <main className="campaign-page-wrapper">
        {/* Hero Banner */}
        <section className="campaign-hero">
          <div className="campaign-container">
            <div className="campaign-badge">Official Matchday Operations</div>
            <h1>Be Part of the Nagaland United Team</h1>
            <p className="lead">
              Step onto the field of action. Whether managing stadium ticketing with Ahibi, serving as a pitch-side volunteer, or running live matchday production with the crew, help us deliver football excellence.
            </p>
            <div className="campaign-hero-actions">
              <Link href="/campaign/register" className="btn-primary">
                Apply for a Role <span>→</span>
              </Link>
              <Link href="/campaign/status" className="btn-secondary">
                Track Application Status
              </Link>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="campaign-container" style={{ marginTop: '50px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--camp-navy-950)', marginBottom: '10px' }}>
              Choose Your Campaign Track
            </h2>
            <p style={{ color: 'var(--camp-muted)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
              Select the operational department that fits your background, passion, and availability.
            </p>
          </div>

          <div className="category-grid">
            {/* Category 1: Ahibi */}
            <div className="category-card highlight">
              <div className="category-icon">🎟️</div>
              <h3>1. Ahibi</h3>
              <p>
                Represent the club at the gates and box offices. Manage ticket scanning, wristband distribution, and attendee customer support.
              </p>
              <div className="category-roles-list">
                <h4>Primary Roles</h4>
                <div className="category-roles-tags">
                  {['Ticketing', 'Gate 1 Scanning', 'Gate 3 Scanning', 'Gate 2 Security', 'Gate 2 Frisking', 'Supervisor', 'Tunnel Entry Team', 'VIP Entry Team'].map(role => (
                    <span key={role} className="role-tag">{role}</span>
                  ))}
                </div>
              </div>
              <Link href="/campaign/register/ahibi" className="btn-primary" style={{ marginTop: 'auto' }}>
                Register for Ahibi
              </Link>
            </div>

            {/* Category 2: Volunteers */}
            <div className="category-card highlight">
              <div className="category-icon">🤝</div>
              <h3>2. Matchday Volunteers</h3>
              <p>
                The heartbeat of stadium operations. Support player welfare, matchday safety, hospitality, and perimeter crowd guidance.
              </p>
              <div className="category-roles-list">
                <h4>Available Roles</h4>
                <div className="category-roles-tags">
                  <span className="role-tag">Stretcher Boys</span>
                  <span className="role-tag">Perimeter Team</span>
                  <span className="role-tag">Security Coordination</span>
                  <span className="role-tag">Supervisors</span>
                  <span className="role-tag">VIP Hospitality</span>
                </div>
              </div>
              <Link href="/campaign/register/volunteer" className="btn-primary" style={{ marginTop: 'auto' }}>
                Register as Volunteer
              </Link>
            </div>

            {/* Category 3: Crew */}
            <div className="category-card highlight">
              <div className="category-icon">⚡</div>
              <h3>3. Technical & Production Crew</h3>
              <p>
                Power the live matchday spectacle. Operate stadium lighting, digital LED hoardings, PA audio sound systems, and broadcast equipment.
              </p>
              <div className="category-roles-list">
                <h4>Technical Roles</h4>
                <div className="category-roles-tags">
                  <span className="role-tag">Lights & Illuminations</span>
                  <span className="role-tag">LED Hoardings & Screens</span>
                  <span className="role-tag">Sound & PA Mixing</span>
                  <span className="role-tag">Technicians</span>
                  <span className="role-tag">Other Logistics</span>
                </div>
              </div>
              <Link href="/campaign/register/crew" className="btn-primary" style={{ marginTop: 'auto' }}>
                Register as Crew
              </Link>
            </div>
          </div>

          {/* Status Check Callout */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--camp-border)',
              borderRadius: 'var(--camp-radius)',
              padding: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
              flexWrap: 'wrap',
              marginTop: '40px',
              boxShadow: 'var(--camp-shadow-sm)',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--camp-navy-950)', marginBottom: '6px' }}>
                Already applied?
              </h3>
              <p style={{ color: 'var(--camp-muted)', margin: 0, fontSize: '0.95rem' }}>
                Check your application status, review assignments, or download your verified digital Event Pass.
              </p>
            </div>
            <Link href="/campaign/status" className="btn-outline">
              Check Status Now →
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
