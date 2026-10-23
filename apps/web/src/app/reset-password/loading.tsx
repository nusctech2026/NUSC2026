import '@/components/membership/membership.css';
import '../forgot-password/recovery.css';

export default function ResetPasswordLoading() {
  return (
    <main className="member-recovery-page" aria-busy="true" aria-live="polite">
      <div className="member-recovery-card">
        <h1>Verifying reset link</h1>
        <p role="status">Preparing your password reset form…</p>
      </div>
    </main>
  );
}
