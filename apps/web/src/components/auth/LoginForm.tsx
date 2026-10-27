'use client';

import React, { useState } from 'react';
import { login } from '@/app/login/actions';
import Link from 'next/link';
import '@/components/membership/membership.css';

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await login(formData);

    if (result?.error) {
      setError(result.error);
      setIsSubmitting(false);
    }
    // If successful, it redirects automatically
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '440px', background: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <a href="/" style={{ display: 'inline-block', width: '48px', height: '48px', background: 'var(--logo) center/contain no-repeat', marginBottom: '16px' }}></a>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Welcome Back</h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '8px' }}>Log in to your NUSC Member Dashboard</p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="split-mem-form" style={{ gap: '20px' }}>
          <div className="split-mem-group">
            <label htmlFor="email">Email Address</label>
            <input type="email" id="email" name="email" required placeholder="name@example.com" />
          </div>
          <div className="split-mem-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" name="password" required placeholder="Enter your password" />
          </div>

          <button type="submit" disabled={isSubmitting} style={{ 
            background: 'var(--navy-600)', 
            color: '#fff', 
            border: 'none', 
            padding: '14px', 
            borderRadius: '6px', 
            fontSize: '1rem', 
            fontWeight: 600,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.7 : 1,
            marginTop: '8px',
            width: '100%'
          }}>
            {isSubmitting ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Not a member yet?{' '}
            <Link href="/membership" style={{ color: 'var(--navy-600)', fontWeight: 600, textDecoration: 'none' }}>
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
