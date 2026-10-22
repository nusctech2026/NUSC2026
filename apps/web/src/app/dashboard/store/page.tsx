import Link from 'next/link';

export const metadata = {
  title: 'NUSC Official Store | Coming Soon',
};

export default function StorePage() {
  return (
    <section style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
        NUSC Official Store coming soon
      </h1>
      <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: 24 }}>
        We’re getting the store ready. Please check back soon.
      </p>
      <Link href="/dashboard">Back to your dashboard</Link>
    </section>
  );
}
