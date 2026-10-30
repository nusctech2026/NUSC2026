import React from 'react';
import type { Metadata } from 'next';
import { Nav } from '@/components/sections/Nav';
import { Footer } from '@/components/sections/Footer';
import CampaignForm from '../campaign/register/CampaignForm';
import './registrations.css';

export const metadata: Metadata = {
  title: 'NUSC IFL 2026–27 Workforce Registration',
  description: 'Official workforce registration for NUSC Indian Football League 2026-27 home matches at Ch\u00fcmoukedima Football Stadium.',
};

export default function RegistrationsPage() {
  return (
    <>
      <Nav theme="light" forceScrolled={true} />
      <main className="campaign-page-wrapper workforce-page-wrapper">
        <CampaignForm />
      </main>
      <Footer />
    </>
  );
}
