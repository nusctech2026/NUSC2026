import { SignOutButton } from '@/components/SignOutButton'

export default function UnauthorizedPage() {
  return (
    <main className="notice-page">
      <div className="notice-mark" aria-hidden="true">N</div>
      <p className="eyebrow">NUSC workforce</p>
      <h1>Scanner access required</h1>
      <p>This account does not have workforce scanning access. Contact your campaign manager if you need access.</p>
      <div className="notice-actions">
        <SignOutButton />
        <a className="button button-secondary" href="/login">Use another account</a>
      </div>
    </main>
  )
}
