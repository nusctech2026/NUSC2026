export default function SecurityPage() {
  return (
    <>
      <h1 className="account-section-title">Password & Security</h1>
      <p className="account-section-desc">
        Ensure your account is using a long, random password to stay secure.
      </p>

      <form action="#">
        <div className="account-form-grid">
          <div className="account-form-group full-width">
            <label htmlFor="currentPassword" className="account-label">Current Password</label>
            <input 
              type="password" 
              id="currentPassword" 
              className="account-input" 
            />
          </div>

          <div className="account-form-group">
            <label htmlFor="newPassword" className="account-label">New Password</label>
            <input 
              type="password" 
              id="newPassword" 
              className="account-input" 
              minLength={8}
            />
          </div>

          <div className="account-form-group">
            <label htmlFor="confirmNewPassword" className="account-label">Confirm New Password</label>
            <input 
              type="password" 
              id="confirmNewPassword" 
              className="account-input" 
              minLength={8}
            />
          </div>
        </div>

        <button type="submit" className="account-submit-btn">
          Update Password
        </button>
      </form>
    </>
  );
}
