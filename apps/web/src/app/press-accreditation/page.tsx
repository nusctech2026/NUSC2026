import React from 'react';
import type { Metadata } from 'next';
import { Nav } from '@/components/sections/Nav';
import { Footer } from '@/components/sections/Footer';
import PressAccreditationForm from './PressAccreditationForm';

export const metadata: Metadata = {
  title: 'Press & Media Accreditation | Nagaland United Sports Club',
  description:
    'Official Press & Media Accreditation Application Form for Nagaland United Sports Club home matches at Chümoukedima Football Stadium, Nagaland for Season 2026–27.',
  openGraph: {
    title: 'Press & Media Accreditation | Nagaland United Sports Club',
    description:
      'Official Press & Media Accreditation Application Form for Nagaland United Sports Club home matches at Chümoukedima Football Stadium, Nagaland for Season 2026–27.',
  },
};

export default function PressAccreditationPage() {
  return (
    <>
      <Nav theme="light" forceScrolled={true} />
      <main>
        <PressAccreditationForm />
      </main>
      <Footer />
    </>
  );
}
