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
      <Nav theme="light" forceScrolled={true} />
      <main style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #1b4b6b 0%, #297a95 100%)',
        minHeight: '100vh',
        padding: '120px 20px 60px',
        overflow: 'hidden'
      }}>

        {/* Polaroids Background Layer */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 0 }}>
          {/* Polaroid 1 - Top Left */}
          <div style={{
            position: 'absolute',
            top: '-5%',
            left: '-2%',
            width: '280px',
            height: '320px',
            backgroundColor: 'white',
            padding: '12px 12px 40px 12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            transform: 'rotate(-12deg)',
            zIndex: 1
          }}>
            <img src="/images/nusc1.jpg" alt="Football" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          {/* Polaroid 2 - Middle Left */}
          <div style={{
            position: 'absolute',
            top: '35%',
            left: '-5%',
            width: '260px',
            height: '300px',
            backgroundColor: 'white',
            padding: '12px 12px 40px 12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            transform: 'rotate(8deg)',
            zIndex: 2
          }}>
            <img src="/images/nusc2.jpg" alt="Football" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          {/* Polaroid 3 - Bottom Left */}
          <div style={{
            position: 'absolute',
            bottom: '-10%',
            left: '2%',
            width: '300px',
            height: '330px',
            backgroundColor: '#f4f4f0',
            padding: '12px 12px 50px 12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            transform: 'rotate(-15deg)',
            zIndex: 3
          }}>
            <img src="/images/nusc3.jpg" alt="Football boots" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          {/* Polaroid 4 - Bottom Right */}
          <div style={{
            position: 'absolute',
            bottom: '-5%',
            right: '2%',
            width: '340px',
            height: '300px',
            backgroundColor: 'white',
            padding: '15px 15px 45px 15px',
            boxShadow: '0 15px 40px rgba(0,0,0,0.4)',
            transform: 'rotate(10deg)',
            zIndex: 1
          }}>
            <img src="/images/nusc4.jpg" alt="Football player" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          {/* Polaroid 5 - Top Right */}
          <div style={{
            position: 'absolute',
            top: '10%',
            right: '-5%',
            width: '240px',
            height: '240px',
            backgroundColor: 'white',
            padding: '10px 10px 30px 10px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            transform: 'rotate(-25deg)',
            zIndex: 1,
            opacity: 0.8
          }}>
            <img src="/images/nusc5.jpg" alt="Football field" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>

        <div style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: '800px',
          margin: '0 auto',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
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
                Renpo Lu Astro Turf, Ungma<br />
                Mokokchung<br />
                October 21, 2026<br />
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
