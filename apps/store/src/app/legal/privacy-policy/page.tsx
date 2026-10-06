export const metadata = {
  title: 'Privacy Policy',
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <h1 className="legal-title">Privacy Policy</h1>
      <div className="legal-prose">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2>1. Information We Collect</h2>
        <p>We collect information that you provide directly to us when you make a purchase, create an account, or contact us for support. This may include your name, email address, shipping address, and payment information.</p>
        
        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Process and fulfill your orders</li>
          <li>Communicate with you about your orders, products, and promotions</li>
          <li>Improve our website and customer service</li>
          <li>Detect and prevent fraud</li>
        </ul>

        <h2>3. Data Sharing</h2>
        <p>We do not sell your personal data. We may share your information with trusted third-party service providers (like payment processors and shipping companies) strictly for the purpose of fulfilling your orders.</p>

        <h2>4. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact us at privacy@nusctech.com.</p>
      </div>
    </>
  );
}
