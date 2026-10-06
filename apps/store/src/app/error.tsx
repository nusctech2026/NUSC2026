"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global app error caught:", error);
  }, [error]);

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '40px 20px',
      textAlign: 'center',
      background: 'var(--paper)',
    }}>
      <div style={{
        background: '#FEF2F2',
        color: 'var(--red)',
        padding: '24px',
        borderRadius: '50%',
        marginBottom: '24px'
      }}>
        <AlertCircle size={64} />
      </div>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--navy-900)', marginBottom: '16px' }}>
        500 / Something went wrong
      </h1>
      <p style={{ color: 'var(--muted)', maxWidth: '400px', marginBottom: '32px', lineHeight: 1.5 }}>
        We experienced an unexpected server error. Please try reloading the page or go back to the homepage.
      </p>
      <div style={{ display: 'flex', gap: '16px' }}>
        <button
          onClick={() => reset()}
          style={{
            padding: '12px 24px',
            background: 'var(--navy-900)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Try again
        </button>
        <Link 
          href="/"
          style={{
            padding: '12px 24px',
            background: 'white',
            color: 'var(--navy-900)',
            border: '1px solid var(--line-l)',
            borderRadius: '4px',
            fontWeight: 600,
            textDecoration: 'none'
          }}
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
