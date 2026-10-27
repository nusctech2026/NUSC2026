import React from 'react';
import type { Metadata } from 'next';
import { Nav } from '@/components/sections/Nav';
import { Footer } from '@/components/sections/Footer';
import CampaignForm from '../CampaignForm';

export const metadata: Metadata = {
  title: 'Crew & Technical Production Registration | NUSC Campaign',
  description: 'Apply for Technical Crew: Lights, LED, Sound, Technician, and matchday production operations.',
};

export default function CrewRegistrationPage() {
  return (
    <>
      <Nav theme="light" forceScrolled={true} />
      <main className="campaign-page-wrapper">
        <CampaignForm fixedCategory="crew" />
      </main>
      <Footer />
    </>
  );
}
