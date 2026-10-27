import type { Metadata } from 'next';
import { Nav } from '@/components/sections/Nav';
import { Footer } from '@/components/sections/Footer';
import JerseyShowcaseClient from './JerseyShowcaseClient';
import './jersey-interest.css';

export const metadata: Metadata = {
  title: 'NUSC Jersey Interest',
  description: 'Explore three NUSC jersey concepts and share your interest. No order or payment is taken.',
};

export default function JerseyInterestPage() {
  return (
    <>
      <Nav theme="light" forceScrolled={true} />
      <main>
        <JerseyShowcaseClient />
      </main>
      <Footer />
    </>
  );
}
