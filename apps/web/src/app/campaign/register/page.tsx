import React from 'react';
import type { Metadata } from 'next';
import { Nav } from '@/components/sections/Nav';
import { Footer } from '@/components/sections/Footer';
import CampaignForm from './CampaignForm';

export const metadata: Metadata = {
  title: 'Apply for Matchday Operations | NUSC Campaign',
  description: 'Submit your application for NUSC Matchday campaigns: Ahibi, Volunteers, or Crew.',
};

export default function CampaignRegisterPage() {
  return (
    <>
      <Nav theme="light" forceScrolled={true} />
      <main className="campaign-page-wrapper">
        <CampaignForm />
      </main>
      <Footer />
    </>
  );
}
