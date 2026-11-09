import { LoginForm } from '@/components/LoginForm'
import { NuscLogo } from '@/components/NuscLogo'

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-panel">
        <div className="brand-lockup">
          <NuscLogo className="brand-logo" />
          <span className="brand-caption">NAGALAND UNITED<br />SPORTS CLUB</span>
        </div>
        <p className="eyebrow">Matchday operations</p>
        <h1>Workforce scanner</h1>
        <p className="login-copy">Sign in with your approved NUSC staff account to record workforce attendance.</p>
        <LoginForm />
        <p className="security-note"><span aria-hidden="true">●</span> Attendance is recorded only after server confirmation.</p>
      </div>
    </main>
  )
}
