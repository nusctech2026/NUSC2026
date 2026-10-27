import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { Nav } from '@/components/sections/Nav';
import { Footer } from '@/components/sections/Footer';
import StatusLookupClient from './StatusLookupClient';
import { getCampaignSessionEmail } from '../actions';

export const metadata: Metadata = {
  title: 'Check Application Status | NUSC Campaign',
  description: 'Track the real-time status of your NUSC Campaign application and access your approved Event Pass.',
};

export default async function CampaignStatusPage() {
  const verifiedEmail = await getCampaignSessionEmail();
  return (
    <>
      <Nav theme="light" forceScrolled={true} />
      <main className="campaign-page-wrapper">
        <Suspense fallback={<div style={{ textAlign: 'center', padding: '60px' }}>Loading status interface...</div>}>
          <StatusLookupClient verifiedEmail={verifiedEmail} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
