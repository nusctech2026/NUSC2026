import type { Metadata } from "next";
import { Nav } from "@/components/sections/Nav";
import { Footer } from "@/components/sections/Footer";
import { PageHeader } from "@/components/page-header";
import { pages } from "@/content/pages";
import { club } from "@/content/site";
import Link from "next/link";
import "../terms/terms.css";

export const metadata: Metadata = {
  title: "About Us",
  description: pages.about.description,
};

export default function AboutUsPage() {
  return (
    <>
      <Nav />
      <main>
        <PageHeader {...pages.about} />

        <div className="terms-page-wrapper">
          <div className="wrap">
            <div className="terms-container">
              <div className="terms-meta-bar">
                <div className="terms-meta-date">
                  <span>●</span> Official Club Information
                </div>
                <div className="terms-meta-tag">Registered Society</div>
              </div>

              <div className="terms-intro-card">
                <p>
                  <strong>{club.name} ({club.shortName})</strong> is a community football club based in Nagaland, India, founded in 2024 under the motto <em>{club.motto}</em>. NUSC is a society registered with the Government of Nagaland (Reg. No. <strong>{club.registration}</strong>).
                </p>
                <p>
                  We identify and develop footballers from across Nagaland, run a competitive first team, and operate community and outreach programmes under our <em>Peace Pays</em> initiative. Within our first two years we won the NSF Martyrs Memorial Trophy (2025) and placed players with professional clubs and state selection.
                </p>
                <p>
                  Through this website we offer club <strong>memberships</strong>, official <strong>merchandise</strong>, <strong>event and trial registrations</strong>, and the ability to <strong>support the club</strong> via partnerships and contributions.
                </p>
              </div>

              <section className="terms-section">
                <h2>Club Profile &amp; Governance</h2>
                <div className="terms-contact-card">
                  <p><strong>Operated by:</strong> {club.name}</p>
                  <p><strong>Registration No.:</strong> {club.registration} (Government of Nagaland)</p>
                  <p><strong>Entity Type:</strong> {club.entityType}</p>
                  <p><strong>Registered Office:</strong> {club.address}</p>
                  <p><strong>Official Email:</strong> <a href={`mailto:${club.email}`}>{club.email}</a></p>
                  <p><strong>Official Website:</strong> <a href="https://www.nagalandunited.com">https://www.nagalandunited.com</a></p>
                </div>
              </section>

              <section className="terms-section">
                <h2>Our Mission &amp; Purpose</h2>
                <p>
                  Nagaland United Sports Club was formed with a singular conviction: to create an enduring, professional football platform that elevates talent from Nagaland and connects them with national and global opportunities.
                </p>
                <p>
                  Beyond competitive achievements, our grassroots youth scouting, community peace tournaments, and player development pathways ensure every young athlete has a dedicated route to progress.
                </p>
                <div style={{ marginTop: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <Link href="/club" className="btn btn-red">Explore Club Journey</Link>
                  <Link href="/contact" className="btn btn-dark" style={{ background: 'var(--navy-900)', color: '#fff' }}>Contact Us</Link>
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
