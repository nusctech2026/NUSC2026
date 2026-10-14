import { Nav } from "@/components/sections/Nav";
import { Footer } from "@/components/sections/Footer";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { pages } from "@/content/pages";
import { club, emailLink } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact Us",
  description: pages.contact.description,
};

export default function ContactPage() {
  return (
    <>
      <Nav />
      <main>
        <PageHeader {...pages.contact} />
        <section className="sect">
          <div className="wrap contact-grid">
            <div className="story reveal">
              <div className="eyebrow red">Get in touch</div>
              <h2>Start a conversation.</h2>
              <p>
                We'd love to hear from you. For any question, order, membership or payment issue, reach us at:
              </p>
              
              <div style={{ marginTop: '16px', marginBottom: '24px' }}>
                <p style={{ margin: '4px 0', fontSize: '1.05rem' }}>
                  <strong>Email:</strong>{" "}
                  <a className="contact-email" href={emailLink()} style={{ display: 'inline', color: 'var(--red)' }}>
                    {club.email}
                  </a>
                </p>
                <p style={{ margin: '8px 0', fontSize: '1.05rem' }}>
                  <strong>Phone / WhatsApp:</strong>{" "}
                  <a href={`tel:${club.phone.replace(/\s+/g, '')}`} style={{ color: 'var(--navy-900)', fontWeight: 600, textDecoration: 'none' }}>
                    {club.phone}
                  </a>
                </p>
                <p style={{ margin: '8px 0', fontSize: '0.95rem', color: 'var(--muted)' }}>
                  <strong>Support Hours:</strong> {club.supportHours}
                </p>
                <p style={{ margin: '4px 0', fontSize: '0.88rem', color: 'var(--muted)' }}>
                  We aim to respond to all inquiries within 2–3 working days.
                </p>
              </div>

              <div className="contact-actions">
                <a className="btn btn-red" href={emailLink()}>
                  Email NUSC <span aria-hidden="true">→</span>
                </a>
                <a
                  className="btn btn-dark"
                  href={club.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Follow NUSC <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>

            <div className="contact-details reveal">
              <div className="eyebrow red">Find your way</div>
              <h2>Rooted in Nagaland.</h2>
              <address style={{ fontStyle: 'normal', lineHeight: 1.6, marginBottom: '8px' }}>
                <strong>{club.name}</strong><br />
                {club.address}
              </address>
              <p style={{ marginBottom: '20px' }}>Registration No. {club.registration}</p>

              {/* Grievance Officer Box for Razorpay */}
              <div style={{ padding: '20px', background: '#f8fafc', border: '1px solid var(--line-l)', borderRadius: '6px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--navy-900)', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Grievance Officer
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '10px', lineHeight: 1.5 }}>
                  In line with applicable Indian law, complaints regarding payments, services or personal data may be addressed to:
                </p>
                <p style={{ fontSize: '0.92rem', margin: '4px 0' }}>
                  <strong>Name:</strong> {club.grievanceOfficer}
                </p>
                <p style={{ fontSize: '0.92rem', margin: '4px 0' }}>
                  <strong>Email:</strong> <a href={`mailto:${club.email}?subject=Grievance`} style={{ color: 'var(--red)', fontWeight: 600 }}>{club.email}</a> (Subject: &quot;Grievance&quot;)
                </p>
                <p style={{ fontSize: '0.92rem', margin: '4px 0' }}>
                  <strong>Address:</strong> {club.address}
                </p>
                <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '10px' }}>
                  We acknowledge grievances within 48 hours and endeavour to resolve them within 15 working days.
                </p>
              </div>

              <div className="contact-route">
                <h3>Partnerships</h3>
                <p>Grow with a young, winning club from the Northeast.</p>
                <Link href="/partners">
                  Explore partnerships <span aria-hidden="true">→</span>
                </Link>
              </div>
              <div className="contact-route">
                <h3>Careers</h3>
                <p>Explore the club’s technical and medical staff opportunities.</p>
                <Link href="/careers">
                  View roles and application details <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
