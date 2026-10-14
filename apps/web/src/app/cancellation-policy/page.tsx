import type { Metadata } from "next";
import { Nav } from "@/components/sections/Nav";
import { Footer } from "@/components/sections/Footer";
import { PageHeader } from "@/components/page-header";
import { pages } from "@/content/pages";
import { club } from "@/content/site";
import Link from "next/link";
import "../terms/terms.css";

export const metadata: Metadata = {
  title: "Cancellation Policy",
  description: pages.cancellation.description,
};

export default function CancellationPolicyPage() {
  return (
    <>
      <Nav />
      <main>
        <PageHeader {...pages.cancellation} />

        <div className="terms-page-wrapper">
          <div className="wrap">
            <div className="terms-container">
              <div className="terms-meta-bar">
                <div className="terms-meta-date">
                  <span>●</span> Last updated: 14 October 2026
                </div>
                <div className="terms-meta-tag">Order &amp; Membership Rules</div>
              </div>

              <div className="terms-intro-card">
                <p>
                  This policy explains when orders, memberships and registrations placed on <strong>nagalandunited.com</strong> can be cancelled. Please read it together with our{" "}
                  <Link href="/refund-policy" style={{ color: 'var(--red)', fontWeight: 700 }}>
                    Refund Policy
                  </Link>.
                </p>
              </div>

              {/* Memberships */}
              <section className="terms-section">
                <h2>Memberships</h2>
                <ul>
                  <li>
                    Memberships are sold per season and are activated immediately on payment. As a general rule, <strong>memberships cannot be cancelled once purchased</strong> and are non-refundable (see Refund Policy).
                  </li>
                  <li>
                    You may contact us within <strong>24 hours</strong> of a membership purchase if you believe it was made in error; we will review such requests case by case before any benefits are used.
                  </li>
                </ul>
              </section>

              {/* Merchandise Orders */}
              <section className="terms-section">
                <h2>Merchandise Orders</h2>
                <ul>
                  <li>
                    Orders for physical merchandise may be cancelled only <strong>before the item has been dispatched</strong>. To request a cancellation, email <a href={`mailto:${club.email}`} style={{ color: 'var(--red)', fontWeight: 600 }}>{club.email}</a> with your order details immediately after ordering.
                  </li>
                  <li>
                    Once an item has been dispatched, it cannot be cancelled.
                  </li>
                </ul>
              </section>

              {/* Event / Trial Registrations */}
              <section className="terms-section">
                <h2>Event / Trial Registrations</h2>
                <p>
                  Where a registration carries a fee, cancellation terms (if any) are stated on that event&apos;s page. Unless stated otherwise, event and trial registrations are <strong>non-cancellable and non-refundable</strong>.
                </p>
              </section>

              {/* Cancellations by NUSC */}
              <section className="terms-section">
                <h2>Cancellations by NUSC</h2>
                <p>
                  We may cancel an order, registration or membership benefit in cases of payment failure, suspected fraud, pricing/technical error, unavailability, or an event being called off. In such cases, any amount already paid for the cancelled item is refunded as per our{" "}
                  <Link href="/refund-policy" style={{ color: 'var(--navy-900)', fontWeight: 600, textDecoration: 'underline' }}>
                    Refund Policy
                  </Link>.
                </p>
              </section>

              {/* Contact */}
              <section className="terms-section">
                <h2>Contact for Cancellations</h2>
                <div className="terms-contact-card">
                  <p>
                    <strong>Email:</strong>{" "}
                    <a href={`mailto:${club.email}?subject=Cancellation%20Request`}>{club.email}</a>
                  </p>
                  <p>
                    <strong>Phone / WhatsApp:</strong> {club.phone}
                  </p>
                  <p>
                    <strong>Club Address:</strong> {club.address}
                  </p>
                  <p style={{ marginTop: '10px', fontSize: '0.88rem', color: '#64748b' }}>
                    Please provide your Order ID, Transaction Reference, and registered contact information in all communications.
                  </p>
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
