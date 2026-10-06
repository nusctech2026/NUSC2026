import Link from "next/link";
import { Package, MapPin, Heart, User, ChevronRight, Gift } from "lucide-react";

export default function AccountOverviewPage() {
  return (
    <>
      <h1 className="account-section-title">Account Overview</h1>
      <p className="account-section-desc">
        Welcome to your NUSC dashboard.
      </p>

      <div className="account-overview-grid single-card">
        {/* Recent Order Card */}
        <div style={{ padding: '24px', border: '1px solid var(--line-l)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--navy-900)' }}>Recent Order</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)', background: 'var(--paper)', padding: '4px 8px', borderRadius: '4px' }}>Shipped</span>
          </div>
          <div style={{ marginBottom: '8px', color: 'var(--muted)' }}>#NUSC1024</div>
          <div style={{ fontWeight: 600, marginBottom: '8px' }}>2026/27 Home Jersey</div>
          <div style={{ marginBottom: '24px' }}>₹ 1,499</div>
          <Link href="/account/orders/NUSC1024" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', color: 'var(--navy-600)', fontWeight: 600 }}>
            View Order <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      <div className="account-quick-links">
        <Link href="/account/orders" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px', padding: '24px 16px', border: '1px solid var(--line-l)', borderRadius: '8px', textDecoration: 'none', color: 'inherit' }}>
          <Package size={28} color="var(--red)" />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>My Orders</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '4px' }}>3 Orders</div>
          </div>
        </Link>
        
        <Link href="/account/wishlist" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px', padding: '24px 16px', border: '1px solid var(--line-l)', borderRadius: '8px', textDecoration: 'none', color: 'inherit' }}>
          <Heart size={28} color="var(--red)" />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>Wishlist</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '4px' }}>5 Items</div>
          </div>
        </Link>

        <Link href="/account/addresses" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px', padding: '24px 16px', border: '1px solid var(--line-l)', borderRadius: '8px', textDecoration: 'none', color: 'inherit' }}>
          <MapPin size={28} color="var(--red)" />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>Addresses</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '4px' }}>2 Saved</div>
          </div>
        </Link>

        <Link href="/account/profile" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px', padding: '24px 16px', border: '1px solid var(--line-l)', borderRadius: '8px', textDecoration: 'none', color: 'inherit' }}>
          <User size={28} color="var(--red)" />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>Profile</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '4px' }}>Edit Details</div>
          </div>
        </Link>
        
        <Link href="/account/benefits" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px', padding: '24px 16px', border: '1px solid var(--line-l)', borderRadius: '8px', textDecoration: 'none', color: 'inherit' }}>
          <Gift size={28} color="var(--red)" />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>Member Benefits</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '4px' }}>100 Points</div>
          </div>
        </Link>
      </div>
    </>
  );
}
