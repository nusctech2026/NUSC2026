import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/sections/Nav';
import { Footer } from '@/components/sections/Footer';
import { getCampaignPass } from '../../actions';
import PassCardView from './PassCardView';
import '../../campaign.css';

export const metadata: Metadata = {
  title: 'Official Matchday Pass | Nagaland United SC',
  description: 'Official digital credential and gate entry pass for Nagaland United Sports Club home matches.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export const dynamic = 'force-dynamic';

export default async function CampaignIdPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getCampaignPass(token);

  if (!result.success || !result.pass) {
    return (
      <>
        <Nav theme="light" forceScrolled={true} />
        <main className="campaign-page-wrapper">
          <div className="campaign-container" style={{ maxWidth: '580px', margin: '60px auto', textAlign: 'center', padding: '20px' }}>
            <div className="form-card" style={{ padding: '40px 24px', borderTop: '4px solid var(--camp-red)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--camp-navy-950)', marginBottom: '8px' }}>
                Credential Not Available
              </h1>
              <p style={{ color: 'var(--camp-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '24px' }}>
                {result.error || 'The requested Event Pass could not be found or has been revoked.'}
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/campaign/status" className="btn-primary">
                  Check Application Status
                </Link>
                <Link href="/registrations" className="btn-outline">
                  Return to Campaign Hub
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Nav theme="light" forceScrolled={true} />
      <main className="campaign-page-wrapper">
        <PassCardView pass={result.pass} />
      </main>
      <Footer />
    </>
  );
}
