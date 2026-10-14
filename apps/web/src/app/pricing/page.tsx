import type { Metadata } from "next";
import { Nav } from "@/components/sections/Nav";
import { Footer } from "@/components/sections/Footer";
import { PageHeader } from "@/components/page-header";
import { pages } from "@/content/pages";
import Link from "next/link";
import "../terms/terms.css";

export const metadata: Metadata = {
  title: "Pricing",
  description: pages.pricing.description,
};

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main>
        <PageHeader {...pages.pricing} />

        <div className="terms-page-wrapper">
          <div className="wrap">
            <div className="terms-container">
              <div className="terms-meta-bar">
                <div className="terms-meta-date">
                  <span>●</span> Official Season 2026 Rates
                </div>
                <div className="terms-meta-tag">Indian Rupees (INR / ₹)</div>
              </div>

              <div className="terms-intro-card">
                <p>
                  All prices are listed in <strong>Indian Rupees (₹)</strong> and are inclusive of applicable taxes unless stated otherwise. Prices are for a single season (<strong>Season 2026</strong>) unless specified.
                </p>
              </div>

              {/* Club Memberships Table */}
              <section className="terms-section">
                <h2>Club Memberships</h2>
                <p>
                  Join the official membership program of Nagaland United Sports Club to access match ticket benefits, priority seating, exclusive merchandise discounts, and club perks.
                </p>

                <div className="pricing-table-wrapper">
                  <table className="pricing-table">
                    <thead>
                      <tr>
                        <th style={{ width: '25%' }}>Tier</th>
                        <th style={{ width: '25%' }}>Price (Per Season)</th>
                        <th style={{ width: '50%' }}>What You Get</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>RISE General</strong></td>
                        <td style={{ fontWeight: 700, color: 'var(--navy-900)' }}>₹3000</td>
                        <td>Admission to 10 home matches (general), digital membership credential &amp; welcome pack, 5% merchandise discount, members-only updates</td>
                      </tr>
                      <tr>
                        <td><strong>Rise Premium</strong></td>
                        <td style={{ fontWeight: 700, color: 'var(--navy-900)' }}>₹10,000</td>
                        <td>Premium gallery seating for 10 home matches, official NUSC scarf/collectible, 10% merchandise discount &amp; early access, draw entries for player meet-and-greets</td>
                      </tr>
                      <tr>
                        <td><strong>Rise VIP Box</strong></td>
                        <td style={{ fontWeight: 700, color: 'var(--navy-900)' }}>₹4,50,000</td>
                        <td>Dedicated VIP box for 10 home matches with hospitality, 7 named memberships + 7 welcome packs, up to 15% merchandise discount, private club experiences</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <Link href="/membership" className="btn btn-red">
                    Sign Up for Membership <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </section>

              {/* Merchandise */}
              <section className="terms-section">
                <h2>Merchandise</h2>
                <p>
                  Official NUSC apparel, jerseys, scarves and collectibles range from <strong>₹[[PRICING]] to ₹[[PRICING]]</strong>.
                </p>
                <p>
                  Individual product prices, available sizes, custom printing options, and applicable shipping fees are displayed transparently on each product page and calculated at checkout prior to payment.
                </p>
              </section>

              {/* Event / Trial Registrations */}
              <section className="terms-section">
                <h2>Event / Trial Registrations</h2>
                <p>
                  Where a fee applies, it is displayed on the specific event or trial page before payment. Some registrations (e.g., open U-23 trials) are <strong>free</strong>.
                </p>

                <div className="terms-callout">
                  <strong>Important Notice:</strong> Prices may change from time to time. The price applicable to your transaction is the exact authoritative amount displayed at the time of payment confirmation.
                </div>
              </section>

              {/* Need assistance */}
              <section className="terms-section">
                <h2>Questions Regarding Pricing or Billing?</h2>
                <p>
                  Contact our accounts and support desk at <a href="mailto:connect@nagalandunited.com" style={{ color: 'var(--red)', fontWeight: 600 }}>connect@nagalandunited.com</a> or view our <Link href="/refund-policy" style={{ color: 'var(--navy-900)', fontWeight: 600, textDecoration: 'underline' }}>Refund Policy</Link> for transaction details.
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
