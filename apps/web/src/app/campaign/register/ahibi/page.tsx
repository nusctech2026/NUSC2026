import React from 'react';
import type { Metadata } from 'next';
import { Nav } from '@/components/sections/Nav';
import { Footer } from '@/components/sections/Footer';
import CampaignForm from '../CampaignForm';

export const metadata: Metadata = {
  title: 'Ahibi Ticketing Registration | NUSC Campaign',
  description: 'Apply for Ahibi Ticketing operations for Nagaland United Sports Club home matches.',
};

export default function AhibiRegistrationPage() {
  return (
    <>
      <Nav theme="light" forceScrolled={true} />
      <main className="campaign-page-wrapper">
        <CampaignForm fixedCategory="ahibi" />
      </main>
      <Footer />
    </>
  );
}
