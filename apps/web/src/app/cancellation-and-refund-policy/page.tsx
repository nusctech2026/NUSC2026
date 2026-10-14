import type { Metadata } from "next";
import { Nav } from "@/components/sections/Nav";
import { Footer } from "@/components/sections/Footer";
import { PageHeader } from "@/components/page-header";
import { club } from "@/content/site";
import Link from "next/link";
import "../terms/terms.css";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy",
  description: "Official cancellation terms and refund guidelines for Nagaland United Sports Club (NUSC) purchases and memberships.",
};

export default function CancellationAndRefundPolicyPage() {
  return (
    <>
      <Nav />
      <main>
        <PageHeader
          title="Cancellation &amp; Refund Policy."
          label="Cancellation &amp; Refund"
          description="Official guidelines governing cancellations, qualifying refunds, and Razorpay processing timelines."
        />

        <div className="terms-page-wrapper">
          <div className="wrap">
            <div className="terms-container">
              <div className="terms-meta-bar">
                <div className="terms-meta-date">
                  <span>●</span> Last updated: 14 October 2026
                </div>
                <div className="terms-meta-tag">Razorpay Merchant Policy</div>
              </div>

              {/* Cancellation Section */}
              <div className="terms-intro-card">
                <p>
                  This combined policy explains when orders, memberships and registrations placed on <strong>nagalandunited.com</strong> can be cancelled or refunded under <strong>Nagaland United Sports Club</strong>.
                </p>
              </div>

              <section className="terms-section">
                <h2>1. Cancellation Policy</h2>
                <h3>Memberships</h3>
                <ul>
                  <li>
                    Memberships are sold per season and are activated immediately on payment. As a general rule, <strong>memberships cannot be cancelled once purchased</strong> and are non-refundable.
                  </li>
                  <li>
                    You may contact us within <strong>24 hours</strong> of a membership purchase if you believe it was made in error; we will review such requests case by case before any benefits are used.
                  </li>
                </ul>

                <h3>Merchandise Orders</h3>
                <ul>
                  <li>
                    Orders for physical merchandise may be cancelled only <strong>before the item has been dispatched</strong>. To request a cancellation, email <a href={`mailto:${club.email}`}>{club.email}</a> immediately after ordering.
                  </li>
                  <li>Once an item has been dispatched, it cannot be cancelled.</li>
                </ul>

                <h3>Event &amp; Trial Registrations</h3>
                <p>
                  Unless stated otherwise on an event&apos;s page, event and trial registrations are <strong>non-cancellable and non-refundable</strong>.
                </p>

                <h3>Cancellations by NUSC</h3>
                <p>
                  We may cancel an order, registration or membership benefit in cases of payment failure, suspected fraud, pricing/technical error, unavailability, or an event being called off. In such cases, any amount already paid is promptly refunded.
                </p>
              </section>

              {/* Refund Section */}
              <section className="terms-section">
                <h2>2. Refund Policy</h2>
                <p>
                  <strong>Our general position: purchases are non-refundable.</strong> Memberships, registrations and contributions are non-refundable. Merchandise is non-refundable except under the limited conditions below.
                </p>

                <h3>When Refunds ARE Issued</h3>
                <ol style={{ margin: '14px 0 18px 24px', padding: 0, color: '#334155' }}>
                  <li style={{ marginBottom: '10px' }}>
                    <strong>Payment deducted but order not confirmed / service not delivered</strong> — money is debited but the order is not created due to technical or gateway errors.
                  </li>
                  <li style={{ marginBottom: '10px' }}>
                    <strong>Duplicate payment</strong> — charged more than once for the same purchase; extra amount is refunded.
                  </li>
                  <li style={{ marginBottom: '10px' }}>
                    <strong>Event cancelled by NUSC</strong> — paid event, trial, or match entitlement cancelled and not rescheduled.
                  </li>
                  <li style={{ marginBottom: '10px' }}>
                    <strong>Damaged, defective or wrong merchandise</strong> — reported with photos within <strong>48 hours</strong> of delivery.
                  </li>
                </ol>

                <h3>Refund Timelines</h3>
                <ul>
                  <li>Approved refunds are initiated within <strong>2–3 working days</strong> of approval.</li>
                  <li>Amounts reach your original payment method (via <strong>Razorpay</strong>) within <strong>5–7 working days</strong>.</li>
                  <li>Refunds are always made to the <strong>original payment method</strong>.</li>
                </ul>

                <h3>Non-Refundable Scenarios</h3>
                <ul>
                  <li>Change of mind on non-defective merchandise</li>
                  <li>Partially or fully used membership benefits</li>
                  <li>Missed matches/events where the fixture went ahead</li>
                  <li>Voluntary contributions/donations</li>
                </ul>
              </section>

              {/* Contact */}
              <section className="terms-section">
                <h2>Contact for Cancellations &amp; Refunds</h2>
                <div className="terms-contact-card">
                  <p><strong>Email:</strong> <a href={`mailto:${club.email}`}>{club.email}</a></p>
                  <p><strong>Phone / WhatsApp:</strong> {club.phone}</p>
                  <p><strong>Support Hours:</strong> {club.supportHours}</p>
                  <p><strong>Registered Address:</strong> {club.address}</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
