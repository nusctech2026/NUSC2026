import type { Metadata } from "next";
import { Nav } from "@/components/sections/Nav";
import { Footer } from "@/components/sections/Footer";
import { PageHeader } from "@/components/page-header";
import { pages } from "@/content/pages";
import { club } from "@/content/site";
import "../terms/terms.css";

export const metadata: Metadata = {
  title: "Shipping & Delivery Policy",
  description: pages.shipping.description,
};

export default function ShippingAndDeliveryPolicyPage() {
  return (
    <>
      <Nav />
      <main>
        <PageHeader {...pages.shipping} />

        <div className="terms-page-wrapper">
          <div className="wrap">
            <div className="terms-container">
              <div className="terms-meta-bar">
                <div className="terms-meta-date">
                  <span>●</span> Last updated: 14 October 2026
                </div>
                <div className="terms-meta-tag">Fulfillment &amp; Logistics</div>
              </div>

              <div className="terms-intro-card">
                <p>
                  This policy covers how we deliver both <strong>digital</strong> and <strong>physical</strong> items purchased on <strong>nagalandunited.com</strong>.
                </p>
              </div>

              {/* Digital Items */}
              <section className="terms-section">
                <h2>Digital Items</h2>
                <p>
                  Digital membership credentials, welcome communications, digital packs, and e-receipts are delivered by <strong>email / WhatsApp to the details you provide, usually within 24–48 hours</strong> of successful payment.
                </p>
                <p>
                  Please ensure your email address and WhatsApp contact number are entered accurately during checkout and registration.
                </p>
              </section>

              {/* Physical items */}
              <section className="terms-section">
                <h2>Physical Items (Merchandise, Scarves, Welcome Packs, Kits)</h2>
                <ul>
                  <li>
                    <strong>Dispatch:</strong> Physical merchandise items are dispatched within <strong>5–10 working days</strong> of order confirmation (dispatch may take longer during high-demand match-day rushes, kit launches, or limited drops; we will notify you if so).
                  </li>
                  <li>
                    <strong>Delivery timeline:</strong> Typically <strong>5–12 working days</strong> from dispatch, depending on your delivery address and location within India.
                  </li>
                  <li>
                    <strong>Delivery areas:</strong> We currently ship <strong>within India</strong>. Delivery to certain remote areas of the Northeast may require additional transit days.
                  </li>
                  <li>
                    <strong>Shipping charges:</strong> Transparently calculated and displayed at checkout before payment is completed (or clearly marked as free shipping promotions where applicable).
                  </li>
                  <li>
                    <strong>Collection option:</strong> Where offered, members may collect certain items in person at a designated club location in Nagaland — this option will be explicitly indicated during checkout.
                  </li>
                  <li>
                    <strong>Tracking:</strong> Where a courier partner or postal service is used, shipment tracking numbers and links are shared via email and WhatsApp upon dispatch.
                  </li>
                  <li>
                    <strong>Non-delivery / damage:</strong> If an item does not arrive within the expected window or arrives damaged, please contact us within <strong>48 hours</strong> of the expected or actual delivery date at <a href={`mailto:${club.email}`} style={{ color: 'var(--red)', fontWeight: 600 }}>{club.email}</a> with photos so we can promptly resolve it.
                  </li>
                </ul>
              </section>

              {/* Contact */}
              <section className="terms-section">
                <h2>Contact for Shipping &amp; Logistics Inquiries</h2>
                <div className="terms-contact-card">
                  <p>
                    <strong>Email:</strong>{" "}
                    <a href={`mailto:${club.email}?subject=Shipping%20Inquiry`}>{club.email}</a>
                  </p>
                  <p>
                    <strong>Phone / WhatsApp:</strong> {club.phone}
                  </p>
                  <p>
                    <strong>Registered Office:</strong> {club.address}
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
