import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/sections/Nav';
import { Footer } from '@/components/sections/Footer';
import ApplicationSuccessClient from './ApplicationSuccessClient';
import '../campaign.css';

export const metadata: Metadata = {
  title: 'Application Received | NUSC Campaign',
  description: 'Your campaign application has been successfully submitted to Nagaland United Sports Club.',
};

export default function ApplicationSuccessPage() {
  return (
    <>
      <Nav theme="light" forceScrolled={true} />
      <main className="campaign-page-wrapper">
        <div className="campaign-container" style={{ maxWidth: '680px', margin: '40px auto', padding: '20px' }}>
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px' }}>Loading confirmation...</div>}>
            <ApplicationSuccessClient />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
