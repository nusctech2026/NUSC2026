import React from 'react';
import type { Metadata } from 'next';
import { Nav } from '@/components/sections/Nav';
import { Footer } from '@/components/sections/Footer';
import CampaignForm from '../CampaignForm';

export const metadata: Metadata = {
  title: 'Volunteer Registration | NUSC Campaign',
  description: 'Apply as a Matchday Volunteer: Stretcher Boys, Perimeter, Security, Supervisors, and Hospitality.',
};

export default function VolunteerRegistrationPage() {
  return (
    <>
      <Nav theme="light" forceScrolled={true} />
      <main className="campaign-page-wrapper">
        <CampaignForm fixedCategory="volunteer" />
      </main>
      <Footer />
    </>
  );
}
