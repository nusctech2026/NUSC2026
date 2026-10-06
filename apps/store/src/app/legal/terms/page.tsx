export const metadata = {
  title: 'Terms of Service',
};

export default function TermsOfServicePage() {
  return (
    <>
      <h1 className="legal-title">Terms of Service</h1>
      <div className="legal-prose">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2>1. Acceptance of Terms</h2>
        <p>By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these terms, please do not use this service.</p>
        
        <h2>2. Use of Site</h2>
        <p>You may use our site for lawful purposes only. You must not use our site in any way that causes, or may cause, damage to the site or impairment of the availability or accessibility of the site.</p>

        <h2>3. Products and Pricing</h2>
        <p>All products and prices are subject to change at any time without notice. We reserve the right to limit the quantities of any products that we offer. We do not warrant that the quality of any products purchased will meet your expectations.</p>

        <h2>4. Governing Law</h2>
        <p>These terms and conditions are governed by and construed in accordance with the laws of the applicable jurisdiction, and you irrevocably submit to the exclusive jurisdiction of the courts in that state or location.</p>
      </div>
    </>
  );
}
