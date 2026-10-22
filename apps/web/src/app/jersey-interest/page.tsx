import type { Metadata } from 'next'
import Link from 'next/link'
import JerseyShowcaseClient from './JerseyShowcaseClient'
import './jersey-interest.css'

export const metadata: Metadata = {
  title: 'NUSC 2026/27 Jersey Collection | Official, Away & Reserve Kits',
  description:
    'Discover the three 2026/27 Nagaland United kits: Official Kit, Away Kit, and Reserve Kit with front and back views. Express your interest and select your estimated sizes to decide production demand and secure early-bird notification.',
  openGraph: {
    title: 'NUSC 2026/27 Jersey Collection — Pre-Order Expression of Interest',
    description:
      'View the Official, Away, and Reserve kits for Nagaland United Sports Club. Show your interest and vote for your favourite kit.',
    images: [{ url: '/images/jerseys/official-kit-front.webp' }],
  },
}

export default function JerseyInterestPage() {
  return (
    <main className="jersey-page-wrapper">
      {/* Official NUSC Jersey Pre-Interest Header */}
      <header className="jersey-top-nav">
        {/* Top Mini Announcement Bar */}
        <div className="jersey-top-bar">
          <div className="jersey-top-bar-inner">
            <span className="jersey-top-bar-kicker">
              NAGALAND UNITED SPORTS CLUB &bull; 2026/27 OFFICIAL JERSEY
            </span>
          </div>
        </div>

        {/* Main Brand & Club Navigation */}
        <div className="jersey-top-nav-inner">
          <div className="jersey-brand-wrapper">
            <Link href="/" className="jersey-brand-mark" aria-label="Nagaland United Sports Club homepage">
              <img src="/crest.png" alt="NUSC Crest" className="jersey-brand-crest" width={36} height={40} />
              <div className="jersey-brand-text">
                <span className="jersey-brand-name">NAGALAND UNITED SC</span>
                <span className="jersey-brand-division">OFFICIAL CLUB MERCHANDISE</span>
              </div>
            </Link>
          </div>

          <nav className="jersey-nav-menu" aria-label="Club navigation">
            <a href="#kits-showcase" className="jersey-menu-link active">
              <span className="jersey-menu-dot" /> 2026/27 KITS
            </a>
            <Link href="/membership" className="jersey-menu-link">
              MEMBERSHIP
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Interactive Showcase Experience */}
      <JerseyShowcaseClient />
    </main>
  )
}

