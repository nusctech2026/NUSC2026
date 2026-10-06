export default function ProfilePage() {
  return (
    <>
      <h1 className="account-section-title">Personal Information</h1>
      <p className="account-section-desc">
        Update your name and contact details.
      </p>

      <form action="#">
        <div className="account-form-grid">
          <div className="account-form-group full-width">
            <label htmlFor="fullName" className="account-label">Full Name</label>
            <input 
              type="text" 
              id="fullName" 
              defaultValue="John Doe"
              className="account-input" 
            />
          </div>

          <div className="account-form-group">
            <label htmlFor="email" className="account-label">Email Address</label>
            <input 
              type="email" 
              id="email" 
              defaultValue="john@example.com"
              className="account-input" 
              disabled
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--muted-2)' }}>Contact support to change your email.</span>
          </div>

          <div className="account-form-group">
            <label htmlFor="phone" className="account-label">Phone Number</label>
            <input 
              type="tel" 
              id="phone" 
              defaultValue="+91 98765 43210"
              className="account-input" 
            />
          </div>
        </div>

        <button type="submit" className="account-submit-btn">
          Save Changes
        </button>
      </form>
    </>
  );
}
