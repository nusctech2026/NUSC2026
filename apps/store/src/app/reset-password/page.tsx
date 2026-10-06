import type { Metadata } from "next";
import Link from "next/link";
import "../auth.css";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Create a new password for your NUSC account.",
};

export default function ResetPasswordPage() {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Create New Password</h1>
        <p className="auth-subtitle">
          Your new password must be different from previous used passwords.
        </p>
        
        <form className="auth-form" action="#">
          <div className="form-group">
            <label htmlFor="password" className="form-label">New Password</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              className="form-input" 
              placeholder="••••••••••••"
              required 
              minLength={8}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--muted-2)' }}>Must be at least 8 characters.</span>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">Confirm New Password</label>
            <input 
              type="password" 
              id="confirmPassword" 
              name="confirmPassword" 
              className="form-input" 
              placeholder="••••••••••••"
              required 
              minLength={8}
            />
          </div>
          
          <button type="submit" className="auth-button">
            Update Password
          </button>
        </form>

        <p className="auth-link-text">
          <Link href="/login" className="auth-link">Back to Log In</Link>
        </p>
      </div>
    </div>
  );
}
