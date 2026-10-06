export default function OrderDetailsPage({ params }: { params: { id: string } }) {
  return (
    <>
      <h1 className="account-section-title">Order #{params.id || "NUSC1024"}</h1>
      <p className="account-section-desc">
        Placed on 24 Sep 2026
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        
        {/* Progress */}
        <div style={{ padding: '24px', border: '1px solid var(--line-l)', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '1.2rem', margin: '0 0 24px 0', color: 'var(--navy-900)' }}>Order Tracking</h3>
          
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            {/* Background Line */}
            <div style={{ position: 'absolute', top: '12px', left: '10%', right: '10%', height: '2px', background: 'var(--line-l)', zIndex: 0 }}></div>
            {/* Active Line (Shipped is step 3 of 4, so 66% width between first and last centers) */}
            <div style={{ position: 'absolute', top: '12px', left: '10%', right: '40%', height: '2px', background: 'var(--navy-900)', zIndex: 1 }}></div>

            {[
              { label: 'Confirmed', completed: true },
              { label: 'Processing', completed: true },
              { label: 'Shipped', completed: true },
              { label: 'Delivered', completed: false }
            ].map((step, idx) => (
              <div key={idx} style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '25%' }}>
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  background: step.completed ? 'var(--navy-900)' : 'white', 
                  border: step.completed ? 'none' : '2px solid var(--line-l)', 
                  color: 'white', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '12px',
                  marginBottom: '8px'
                }}>
                  {step.completed ? '✓' : ''}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: step.completed ? 600 : 400, color: step.completed ? 'var(--navy-900)' : 'var(--muted)', textAlign: 'center' }}>
                  {step.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="account-order-info-grid">
          <div style={{ padding: '24px', border: '1px solid var(--line-l)', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '1.2rem', margin: '0 0 16px 0', color: 'var(--navy-900)' }}>Shipping Address</h3>
            <div style={{ color: 'var(--ink)', lineHeight: 1.5 }}>
              John Doe<br />
              Dimapur, Nagaland<br />
              797112<br />
              India
            </div>
          </div>
          <div style={{ padding: '24px', border: '1px solid var(--line-l)', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '1.2rem', margin: '0 0 16px 0', color: 'var(--navy-900)' }}>Payment Method</h3>
            <div style={{ color: 'var(--ink)', lineHeight: 1.5 }}>
              UPI<br />
              <strong style={{ color: 'var(--navy-900)' }}>Paid</strong>
            </div>
          </div>
        </div>

        {/* Items & Totals */}
        <div style={{ padding: '24px', border: '1px solid var(--line-l)', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '1.2rem', margin: '0 0 24px 0', color: 'var(--navy-900)' }}>Items</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line-l)', paddingBottom: '16px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontWeight: 600 }}>NUSC Home Jersey 2026/27</div>
              <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Size: M | Qty: 1</div>
            </div>
            <div style={{ fontWeight: 600 }}>₹ 1,499</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--muted)' }}>
            <span>Subtotal</span>
            <span>₹ 1,499</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: 'var(--muted)' }}>
            <span>Shipping</span>
            <span>₹ 100</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.2rem', color: 'var(--navy-900)', borderTop: '1px solid var(--line-l)', paddingTop: '16px' }}>
            <span>Total</span>
            <span>₹ 1,599</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <button style={{ padding: '12px 24px', background: 'var(--navy-900)', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}>Track Package</button>
          <button style={{ padding: '12px 24px', background: 'var(--white)', color: 'var(--navy-900)', border: '1px solid var(--line-l)', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}>Download Invoice</button>
          <button style={{ padding: '12px 24px', background: 'var(--white)', color: 'var(--red)', border: '1px solid var(--line-l)', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}>Request Return</button>
        </div>

      </div>
    </>
  );
}
