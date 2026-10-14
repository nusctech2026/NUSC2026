import type { Metadata } from "next";
import { Nav } from "@/components/sections/Nav";
import { Footer } from "@/components/sections/Footer";
import { PageHeader } from "@/components/page-header";
import { pages } from "@/content/pages";
import { club } from "@/content/site";
import Link from "next/link";
import "../terms/terms.css";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: pages.refund.description,
};

export default function RefundPolicyPage() {
  return (
    <>
      <Nav />
      <main>
        <PageHeader {...pages.refund} />

        <div className="terms-page-wrapper">
          <div className="wrap">
            <div className="terms-container">
              <div className="terms-meta-bar">
                <div className="terms-meta-date">
                  <span>●</span> Last updated: 14 October 2026
                </div>
                <div className="terms-meta-tag">Razorpay Payment Guidelines</div>
              </div>

              {/* General Position */}
              <div className="terms-intro-card">
                <p>
                  <strong>Our general position: purchases are non-refundable.</strong>
                </p>
                <p>
                  Memberships, event/trial registrations and donations/contributions purchased through <strong>nagalandunited.com</strong> are <strong>non-refundable</strong>. Merchandise is non-refundable except where the limited conditions below apply. Please choose carefully before paying.
                </p>
              </div>

              {/* When refunds ARE issued */}
              <section className="terms-section">
                <h2>When Refunds ARE Issued</h2>
                <p>Despite the general position, we will issue a refund in the following cases:</p>
                <ol style={{ margin: '16px 0 20px 24px', padding: 0, color: '#334155', lineHeight: 1.75 }}>
                  <li style={{ marginBottom: '12px' }}>
                    <strong>Payment deducted but order not confirmed / service not delivered</strong> — e.g., money is debited from your bank or account but the membership, registration or order is not created due to a technical or payment gateway network failure.
                  </li>
                  <li style={{ marginBottom: '12px' }}>
                    <strong>Duplicate payment</strong> — you were charged more than once for the same transaction; we immediately refund the extra amount(s).
                  </li>
                  <li style={{ marginBottom: '12px' }}>
                    <strong>Event cancelled by NUSC</strong> — a paid event, match-access entitlement or trial is cancelled by the club and not rescheduled or substituted.
                  </li>
                  <li style={{ marginBottom: '12px' }}>
                    <strong>Damaged, defective or wrong merchandise</strong> — reported with clear photographs within <strong>48 hours</strong> of delivery; after verification we offer an eligible replacement or refund (see{" "}
                    <Link href="/shipping-and-delivery-policy" style={{ color: 'var(--red)', fontWeight: 600 }}>
                      Shipping &amp; Delivery Policy
                    </Link>).
                  </li>
                </ol>
              </section>

              {/* Refund timelines */}
              <section className="terms-section">
                <h2>Refund Timelines</h2>
                <ul>
                  <li>
                    Approved refunds are initiated within <strong>2–3 working days</strong> of approval.
                  </li>
                  <li>
                    Once initiated, the amount reaches your original payment method (via <strong>Razorpay</strong>) within <strong>5–7 working days</strong>, depending on your bank or card issuer.
                  </li>
                  <li>
                    Refunds are always made directly to the <strong>original payment method</strong> (UPI, card, or net banking); we do not refund by cash or to third-party accounts.
                  </li>
                </ul>
              </section>

              {/* How to request a refund */}
              <section className="terms-section">
                <h2>How to Request a Refund</h2>
                <p>
                  Email <a href={`mailto:${club.email}?subject=Refund%20Request`} style={{ color: 'var(--red)', fontWeight: 600 }}>{club.email}</a> with:
                </p>
                <ul>
                  <li>Your full name</li>
                  <li>Registered mobile number / WhatsApp</li>
                  <li>Order / Transaction ID</li>
                  <li>Payment date and amount</li>
                  <li>Reason for request (with clear photographs if reporting damaged or incorrect goods)</li>
                </ul>
                <p>
                  Telephone assistance: <strong>{club.phone}</strong>.
                </p>
              </section>

              {/* Not refundable */}
              <section className="terms-section">
                <h2>Items That Are Not Refundable</h2>
                <ul>
                  <li>Change of mind on non-defective merchandise</li>
                  <li>Partially or fully used membership benefits</li>
                  <li>Missed matches, fixtures, or events where the fixture went ahead as scheduled</li>
                  <li>Voluntary contributions, club donations, or sponsorship contributions</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
