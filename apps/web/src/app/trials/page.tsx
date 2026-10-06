import type { Metadata } from "next";
import TrialRegistrationForm from "./TrialRegistrationForm";
import { Nav } from "@/components/sections/Nav";
import { Footer } from "@/components/sections/Footer";

export const metadata: Metadata = {
  title: "U23 Trials Registration - Oct 21, 2026",
  description: "Register for the NUSC U23 Trials held at T.AO ground for Ungma Village and Nagaland.",
};

export default function TrialRegistrationPage() {
  return (
    <>
      <Nav theme="light" />
      <main style={{ backgroundColor: 'var(--paper)', minHeight: '100vh', padding: '120px 20px 60px' }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          backgroundColor: 'var(--white)',
          overflow: 'hidden',
          borderRadius: '8px'
        }}>

          {/* Header Hero Banner */}
          <div style={{
            backgroundColor: 'var(--navy-600)',
            position: 'relative',
            padding: '60px 40px',
            color: 'var(--white)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end', /* text on the right */
          }}>

            {/* Image constrained to left side */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '60%',
              height: '100%',
              backgroundImage: "url('https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=1200&auto=format&fit=crop')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              pointerEvents: 'none'
            }} />

            {/* Dark gradient overlay to blend image into the solid background */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(90deg, rgba(26,63,122,0) 0%, rgba(26,63,122,0.3) 30%, rgba(26,63,122,0.9) 55%, rgba(26,63,122,1) 60%, rgba(26,63,122,1) 100%)',
              pointerEvents: 'none'
            }} />

            <div style={{ position: 'relative', zIndex: 1, textAlign: 'right', maxWidth: '450px' }}>
              <h1 style={{
                fontSize: '3.2rem',
                fontWeight: 800,
                lineHeight: 1,
                margin: 0,
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                NUSC TRIALS
              </h1>
              
              <p style={{ 
                marginTop: '16px', 
                fontSize: '1.05rem', 
                color: 'rgba(255,255,255,0.95)', 
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                lineHeight: 1.6
              }}>
                RENPO LU ASTRO TURF, Ungma<br/>
                Mokokchung<br/>
                October 21, 2026<br/>
                U-23 | Indigenous Nagas Only
              </p>

              <div style={{
                marginTop: '24px',
                fontWeight: 700,
                fontSize: '1.1rem',
                letterSpacing: '0.05em',
                color: '#FDE047',
                textTransform: 'uppercase',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}>
                FREE REGISTRATION
              </div>
              
              <p style={{ marginTop: '4px', fontSize: '0.95rem', fontStyle: 'italic', opacity: 0.85, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                Rise Together.
              </p>
            </div>
          </div>

          {/* Form Container */}
          <div>
            <TrialRegistrationForm />
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
