import type { Metadata } from "next";
import Link from "next/link";
import "../auth.css";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your NUSC account password.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Forgot Password?</h1>
        <p className="auth-subtitle">
          Enter your email address and we'll send you a link to reset your password.
        </p>
        
        <form className="auth-form" action="#">
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              className="form-input" 
              placeholder="you@example.com"
              required 
            />
          </div>
          
          <button type="submit" className="auth-button">
            Send Reset Link
          </button>
        </form>

        <p className="auth-link-text">
          Remember your password? <Link href="/login" className="auth-link">Back to Log In</Link>
        </p>
      </div>
    </div>
  );
}
