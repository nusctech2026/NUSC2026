import type { Metadata } from "next";
import { Nav } from "@/components/sections/Nav";
import { Footer } from "@/components/sections/Footer";
import { PageHeader } from "@/components/page-header";
import { pages } from "@/content/pages";
import { club } from "@/content/site";
import "../terms/terms.css";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: pages.privacy.description,
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <Nav />
      <main>
        <PageHeader {...pages.privacy} />

        <div className="terms-page-wrapper">
          <div className="wrap">
            <div className="terms-container">
              <div className="terms-meta-bar">
                <div className="terms-meta-date">
                  <span>●</span> Last updated: 14 October 2026
                </div>
                <div className="terms-meta-tag">DPDP Act, 2023 Compliant</div>
              </div>

              <div className="terms-intro-card">
                <p>
                  <strong>{club.name}</strong> (&quot;NUSC&quot;, &quot;we&quot;, &quot;us&quot;) respects your privacy and handles your personal data in accordance with applicable Indian law, including the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000 and rules made thereunder.
                </p>
              </div>

              {/* Section 1 */}
              <section className="terms-section">
                <h2>1. Information We Collect</h2>
                <ul>
                  <li>
                    <strong>Details you give us:</strong> name, date of birth, email, mobile/WhatsApp number, city/district, membership tier, and, for trials, eligibility information (e.g., Indigenous Inhabitant Certificate status).
                  </li>
                  <li>
                    <strong>Transaction information:</strong> records of memberships, registrations and orders. <strong>Payment details (card/UPI/bank) are collected and processed directly by Razorpay — we do not receive or store them.</strong>
                  </li>
                  <li>
                    <strong>Technical information:</strong> basic device and usage data via standard website analytics and cookies.
                  </li>
                </ul>
              </section>

              {/* Section 2 */}
              <section className="terms-section">
                <h2>2. How We Use Your Information</h2>
                <p>
                  We use your personal data to process payments and deliver memberships, merchandise and registrations; to communicate about fixtures, orders and club activity (where you have opted in); to provide support; to meet legal and accounting obligations; and to improve the Website.
                </p>
              </section>

              {/* Section 3 */}
              <section className="terms-section">
                <h2>3. Sharing</h2>
                <p>
                  We share data only with: our payment processor (<strong>Razorpay</strong>), delivery/logistics partners, communication and IT service providers, and authorities where required by law.
                </p>
                <p>
                  We do <strong>not</strong> sell your personal data under any circumstances.
                </p>
              </section>

              {/* Section 4 */}
              <section className="terms-section">
                <h2>4. Marketing</h2>
                <p>
                  Where you opt in, we may send updates via WhatsApp/email. You can withdraw consent any time by emailing us at <a href={`mailto:${club.email}`} style={{ color: 'var(--red)', fontWeight: 600 }}>{club.email}</a> or using the unsubscribe option.
                </p>
              </section>

              {/* Section 5 */}
              <section className="terms-section">
                <h2>5. Data Retention</h2>
                <p>
                  We keep personal data only as long as needed for the purposes above or as required by law (e.g., statutory tax records), after which it is safely deleted or anonymised.
                </p>
              </section>

              {/* Section 6 */}
              <section className="terms-section">
                <h2>6. Your Rights</h2>
                <p>
                  Subject to Indian law, you may request access to, correction of, or deletion of your personal data, and may withdraw your consent at any time. Simply email <a href={`mailto:${club.email}`} style={{ color: 'var(--red)', fontWeight: 600 }}>{club.email}</a>.
                </p>
              </section>

              {/* Section 7 */}
              <section className="terms-section">
                <h2>7. Security</h2>
                <p>
                  We implement reasonable technical and organisational measures to protect your data. No method of internet transmission is completely secure, but we work diligently to safeguard the information you share.
                </p>
              </section>

              {/* Section 8 */}
              <section className="terms-section">
                <h2>8. Children</h2>
                <p>
                  Trial and youth football programmes may involve minors. Where we process a minor&apos;s data, we do so strictly with parental/guardian consent and the information provided by them.
                </p>
              </section>

              {/* Section 9 */}
              <section className="terms-section">
                <h2>9. Grievance Officer</h2>
                <p>
                  For privacy concerns or to exercise your rights under the DPDP Act, contact our Grievance Officer:
                </p>
                <div className="terms-contact-card">
                  <p><strong>Name:</strong> {club.grievanceOfficer}</p>
                  <p><strong>Email:</strong> <a href={`mailto:${club.email}?subject=Data%20Privacy`}>{club.email}</a> (Subject: &quot;Data Privacy&quot;)</p>
                  <p><strong>Address:</strong> {club.address}</p>
                  <p><strong>Phone:</strong> {club.phone}</p>
                </div>
              </section>

              {/* Section 10 */}
              <section className="terms-section">
                <h2>10. Changes to This Policy</h2>
                <p>
                  We may update this policy periodically; the current authoritative version is always published on this page.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
