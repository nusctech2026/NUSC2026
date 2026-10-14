import type { Metadata } from "next";
import { Nav } from "@/components/sections/Nav";
import { Footer } from "@/components/sections/Footer";
import { PageHeader } from "@/components/page-header";
import { pages } from "@/content/pages";
import { club } from "@/content/site";
import Link from "next/link";
import "./terms.css";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: pages.terms.description,
};

export default function TermsAndConditionsPage() {
  return (
    <>
      <Nav />
      <main>
        <PageHeader {...pages.terms} />

        <div className="terms-page-wrapper">
          <div className="wrap">
            <div className="terms-container">
              {/* Meta bar */}
              <div className="terms-meta-bar">
                <div className="terms-meta-date">
                  <span>●</span> Last updated: 14 October 2026
                </div>
                <div className="terms-meta-tag">Website &amp; Store Terms</div>
              </div>

              {/* Introduction Card */}
              <div className="terms-intro-card">
                <p>
                  These Terms &amp; Conditions (&quot;Terms&quot;) govern your use of <strong>https://www.nagalandunited.com</strong> (the &quot;Website&quot;) and any memberships, merchandise, event registrations or other services purchased through it, operated by <strong>{club.name}</strong> (&quot;NUSC&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;), a society registered with the Government of Nagaland (Reg. No. <strong>{club.registration}</strong>).
                </p>
                <p>
                  By accessing the Website or making a purchase, you agree to these Terms. If you do not agree, please do not use the Website.
                </p>
              </div>

              {/* Section 1 */}
              <section className="terms-section" id="eligibility">
                <h2>1. Eligibility</h2>
                <p>
                  You must be at least 18 years old to make a payment, or have the consent of a parent/guardian who accepts these Terms on your behalf. By transacting, you confirm the information you provide is true and complete.
                </p>
              </section>

              {/* Section 2 */}
              <section className="terms-section" id="memberships">
                <h2>2. Memberships</h2>
                <ul>
                  <li>Memberships are sold per season and grant the benefits described on the membership page for that tier.</li>
                  <li>Match admission benefits are subject to fixture scheduling, venue capacity and applicable rules; fixtures, dates and venues may change.</li>
                  <li>Membership benefits are personal to the named member(s) and are non-transferable unless we state otherwise.</li>
                  <li>We may add, modify or withdraw specific benefits where reasonably necessary; where a change is material we will give reasonable notice.</li>
                </ul>
              </section>

              {/* Section 3 */}
              <section className="terms-section" id="merchandise">
                <h2>3. Merchandise</h2>
                <ul>
                  <li>Product images and descriptions are indicative; colours and finishes may vary slightly.</li>
                  <li>Availability is not guaranteed; if an item becomes unavailable after purchase we will offer a replacement or a refund of that item.</li>
                </ul>
              </section>

              {/* Section 4 */}
              <section className="terms-section" id="pricing-payments">
                <h2>4. Pricing &amp; Payments</h2>
                <ul>
                  <li>All prices are in Indian Rupees (₹) and payable in full at the time of purchase.</li>
                  <li>Payments are processed by our third-party payment partner, <strong>Razorpay</strong>. We do not store your card, UPI or bank details.</li>
                  <li>An order/registration is confirmed only after we receive successful payment confirmation.</li>
                  <li>In case of a pricing or technical error, we may cancel the affected order and refund any amount collected.</li>
                </ul>
              </section>

              {/* Section 5 */}
              <section className="terms-section" id="cancellation-refunds">
                <h2>5. Cancellation &amp; Refunds</h2>
                <p>
                  Cancellations and refunds are governed by our{" "}
                  <Link href="/cancellation-policy" style={{ color: 'var(--red)', fontWeight: 600 }}>
                    Cancellation Policy
                  </Link>{" "}
                  and{" "}
                  <Link href="/refund-policy" style={{ color: 'var(--red)', fontWeight: 600 }}>
                    Refund Policy
                  </Link>
                  , which form part of these Terms.
                </p>
              </section>

              {/* Section 6 */}
              <section className="terms-section" id="delivery">
                <h2>6. Delivery of Goods and Digital Items</h2>
                <p>
                  Delivery of physical and digital items is governed by our{" "}
                  <Link href="/shipping-and-delivery-policy" style={{ color: 'var(--red)', fontWeight: 600 }}>
                    Shipping &amp; Delivery Policy
                  </Link>.
                </p>
              </section>

              {/* Section 7 */}
              <section className="terms-section" id="conduct">
                <h2>7. Conduct at Matches and Events</h2>
                <p>
                  Entry to matches, trials and events is subject to venue rules and the directions of club and venue staff. We may refuse entry or remove any person for unsafe, unlawful or disruptive behaviour, without refund.
                </p>
              </section>

              {/* Section 8 */}
              <section className="terms-section" id="intellectual-property">
                <h2>8. Intellectual Property</h2>
                <p>
                  The NUSC name, badge, logos, content and designs are owned by or licensed to NUSC and may not be copied or used without our written permission.
                </p>
              </section>

              {/* Section 9 */}
              <section className="terms-section" id="liability">
                <h2>9. Limitation of Liability</h2>
                <p>
                  To the maximum extent permitted by law, NUSC&apos;s total liability arising from any purchase is limited to the amount you paid for that purchase. We are not liable for indirect or consequential losses, or for events beyond our reasonable control (including fixture postponements, weather, venue or authority decisions).
                </p>
              </section>

              {/* Section 10 */}
              <section className="terms-section" id="changes">
                <h2>10. Changes to These Terms</h2>
                <p>
                  We may update these Terms from time to time. The version in force is the one published on this page at the time of your purchase.
                </p>
              </section>

              {/* Section 11 */}
              <section className="terms-section" id="governing-law">
                <h2>11. Governing Law &amp; Jurisdiction</h2>
                <p>
                  These Terms are governed by the laws of India. Courts at <strong>Chümoukedima / Dimapur, Nagaland</strong> have exclusive jurisdiction.
                </p>
              </section>

              {/* Section 12 */}
              <section className="terms-section" id="contact">
                <h2>12. Contact</h2>
                <p>
                  Questions about these Terms:{" "}
                  <a href={`mailto:${club.email}`} style={{ color: 'var(--red)', fontWeight: 600 }}>
                    {club.email}
                  </a>
                  , <strong>{club.phone}</strong>.
                </p>
                <div className="terms-contact-card">
                  <p><strong>{club.name}</strong></p>
                  <p>{club.address}</p>
                  <p>Registration No.: {club.registration}</p>
                </div>
              </section>

              <div className="terms-closing-banner">
                <p>
                  By accessing the Website or completing any purchase or registration, you acknowledge that you have read, understood, and agreed to these Terms &amp; Conditions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
