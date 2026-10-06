export default function AddressesPage() {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 className="account-section-title" style={{ marginBottom: 0 }}>Saved Addresses</h1>
          <p className="account-section-desc" style={{ marginBottom: 0 }}>
            Manage your shipping and billing addresses.
          </p>
        </div>
        <button style={{ padding: '12px 24px', background: 'var(--navy-900)', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}>
          + Add New Address
        </button>
      </div>

      <div className="account-cards-grid">
        
        {/* Default Address */}
        <div style={{ border: '1px solid var(--line-l)', borderRadius: '8px', padding: '24px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '24px', right: '24px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--white)', background: 'var(--navy-900)', padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
            Default
          </div>
          <h3 style={{ margin: '0 0 16px 0', color: 'var(--navy-900)' }}>HOME</h3>
          <div style={{ color: 'var(--ink)', lineHeight: 1.6, marginBottom: '24px' }}>
            <strong>John Doe</strong><br />
            House No. XX<br />
            Dimapur<br />
            Nagaland - 797112<br />
            +91 98765 43210
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button style={{ color: 'var(--navy-600)', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer', padding: 0 }}>Edit</button>
            <button style={{ color: 'var(--red)', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer', padding: 0 }}>Delete</button>
          </div>
        </div>

        {/* Other Address */}
        <div style={{ border: '1px solid var(--line-l)', borderRadius: '8px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: 'var(--navy-900)' }}>WORK</h3>
          <div style={{ color: 'var(--ink)', lineHeight: 1.6, marginBottom: '24px' }}>
            <strong>John Doe</strong><br />
            Tech Park, Tower B<br />
            Bengaluru<br />
            Karnataka - 560001<br />
            +91 98765 43210
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button style={{ color: 'var(--navy-600)', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer', padding: 0 }}>Edit</button>
            <button style={{ color: 'var(--red)', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer', padding: 0 }}>Delete</button>
            <button style={{ color: 'var(--muted)', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer', padding: 0, marginLeft: 'auto' }}>Set Default</button>
          </div>
        </div>

      </div>
    </>
  );
}
