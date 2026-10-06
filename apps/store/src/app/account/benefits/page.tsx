import Link from "next/link";
import { Ticket, History } from "lucide-react";

export const metadata = {
  title: 'Member Benefits | NUSC Account',
};

export default function BenefitsPage() {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 className="account-section-title">Member Benefits</h1>
          <p className="account-section-desc">
            Redeem your NUSC Points for exclusive tickets and matchday experiences.
          </p>
        </div>
        
        <div style={{ background: 'var(--navy-900)', color: 'white', padding: '16px 24px', borderRadius: '8px', minWidth: '160px' }}>
          <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', color: 'rgba(255,255,255,0.7)' }}>Points Balance</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>100</div>
        </div>
      </div>

      <div style={{ borderBottom: '1px solid var(--line-l)', marginBottom: '32px' }}>
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ paddingBottom: '12px', borderBottom: '2px solid var(--red)', fontWeight: 600, color: 'var(--navy-900)' }}>
            Available Benefits
          </div>
          <Link href="/account/benefits/history" style={{ paddingBottom: '12px', color: 'var(--muted)', textDecoration: 'none' }}>
            History
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        
        {/* Benefit Card */}
        <div style={{ border: '1px solid var(--line-l)', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: 'var(--navy-950)', color: 'white', padding: '20px', position: 'relative' }}>
            <Ticket size={24} style={{ marginBottom: '12px', color: 'var(--red)' }} />
            <h3 style={{ fontSize: '1.25rem', margin: '0 0 4px 0', fontWeight: 700 }}>NUSC vs Shillong FC</h3>
            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>18 NOV 2026 • Home Match</div>
            
            <div style={{ position: 'absolute', top: '20px', right: '20px', background: 'var(--red)', color: 'white', padding: '4px 12px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 700 }}>
              10% OFF
            </div>
          </div>
          <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <p style={{ margin: '0 0 16px 0', color: 'var(--muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Use your NUSC Points to claim an exclusive 10% discount on match tickets.
            </p>
            <div style={{ marginTop: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderTop: '1px dashed var(--line-l)', paddingTop: '16px' }}>
                <span style={{ fontWeight: 600, color: 'var(--navy-900)' }}>Points Required:</span>
                <span style={{ fontWeight: 800, color: 'var(--red)', fontSize: '1.2rem' }}>10 pts</span>
              </div>
              <button style={{ width: '100%', padding: '14px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
                Redeem & Buy Ticket
              </button>
            </div>
          </div>
        </div>

        {/* Another Benefit Card */}
        <div style={{ border: '1px solid var(--line-l)', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: 'var(--navy-950)', color: 'white', padding: '20px', position: 'relative' }}>
            <Ticket size={24} style={{ marginBottom: '12px', color: 'var(--red)' }} />
            <h3 style={{ fontSize: '1.25rem', margin: '0 0 4px 0', fontWeight: 700 }}>Stadium Tour</h3>
            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>Dec 2026 • Exclusive Access</div>
            
            <div style={{ position: 'absolute', top: '20px', right: '20px', background: 'var(--red)', color: 'white', padding: '4px 12px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 700 }}>
              FREE
            </div>
          </div>
          <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <p style={{ margin: '0 0 16px 0', color: 'var(--muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Get a free behind-the-scenes stadium tour as part of your annual membership.
            </p>
            <div style={{ marginTop: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderTop: '1px dashed var(--line-l)', paddingTop: '16px' }}>
                <span style={{ fontWeight: 600, color: 'var(--navy-900)' }}>Points Required:</span>
                <span style={{ fontWeight: 800, color: 'var(--red)', fontSize: '1.2rem' }}>50 pts</span>
              </div>
              <button style={{ width: '100%', padding: '14px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
                Redeem Experience
              </button>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
