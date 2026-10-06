"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { register } from "../actions/auth";
import "../auth.css";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="auth-button" disabled={pending}>
      {pending ? "Creating Account..." : "Create Account"}
    </button>
  );
}

export default function RegisterPage() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const clientAction = async (formData: FormData) => {
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }

    const res = await register(formData);
    if (res?.error) {
      setErrorMsg(res.error);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Join NUSC to unlock exclusive offers</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          <button type="button" className="auth-social-btn">
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              <path d="M1 1h22v22H1z" fill="none"/>
            </svg>
            Continue with Google
          </button>
        </div>
        
        <div className="divider-wrap" style={{ marginTop: 0 }}>
          <span>Or sign up with email</span>
        </div>

        {errorMsg && (
          <div style={{ background: '#FEF2F2', border: '1px solid var(--red)', color: 'var(--red)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.95rem' }}>
            {errorMsg}
          </div>
        )}

        <form className="auth-form" action={clientAction}>
          <div className="form-group">
            <label htmlFor="fullName" className="form-label">Full Name</label>
            <input 
              type="text" 
              id="fullName" 
              name="fullName" 
              className="form-input" 
              placeholder="John Doe"
              required 
            />
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              className="form-input" 
              placeholder="john@example.com"
              required 
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="phone" className="form-label">Phone Number</label>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted-2)' }}>Optional</span>
            </div>
            <input 
              type="tel" 
              id="phone" 
              name="phone" 
              className="form-input" 
              placeholder="+91 98765 43210"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              className="form-input" 
              placeholder="••••••••••••"
              required 
              minLength={8}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
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

          <div className="auth-checkbox-group">
            <label className="auth-checkbox-label">
              <input type="checkbox" id="terms" name="terms" required className="auth-checkbox" />
              <span>I agree to the <Link href="/terms" className="auth-link">Terms &amp; Conditions</Link> and <Link href="/privacy" className="auth-link">Privacy Policy</Link></span>
            </label>

            <label className="auth-checkbox-label">
              <input type="checkbox" id="marketing" name="marketing" className="auth-checkbox" />
              <span>Send me updates about new NUSC kits, merchandise, and offers</span>
            </label>
          </div>
          
          <SubmitButton />
        </form>

        <p className="auth-link-text">
          Already have an account? <Link href="/login" className="auth-link">Log In</Link>
        </p>
      </div>
    </div>
  );
}
