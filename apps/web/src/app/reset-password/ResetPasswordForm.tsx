'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { updatePassword } from './actions';

export default function ResetPasswordForm() {
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const result = await updatePassword(new FormData(event.currentTarget));
      if (result.error) setError(result.error);
      if (result.success) setDone(true);
    } catch {
      setError('Unable to update your password. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h1>Choose a new password</h1>
      {done ? (
        <p role="status">Your password has been updated. <Link href="/login">Log in with your new password</Link>.</p>
      ) : (
        <>
          <p>Enter and confirm your new password.</p>
          {error && <p className="member-recovery-error" role="alert">{error}</p>}
          <form onSubmit={submit} className="split-mem-form">
            <div className="split-mem-group">
              <label htmlFor="password">New password</label>
              <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            <div className="split-mem-group">
              <label htmlFor="confirmation">Confirm new password</label>
              <input id="confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            <button className="member-recovery-submit" type="submit" disabled={pending}>
              {pending ? 'Updating...' : 'Update password'}
            </button>
          </form>
          <p><Link href="/forgot-password">Request a new reset link</Link></p>
        </>
      )}
    </>
  );
}
