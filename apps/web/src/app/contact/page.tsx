import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { pages } from "@/content/pages";
import { club, emailLink } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact",
  description: pages.contact.description,
};

export default function ContactPage() {
  return (
    <>
      <PageHeader {...pages.contact} />
      <section className="sect">
        <div className="wrap contact-grid">
          <div className="story reveal">
            <div className="eyebrow red">Get in touch</div>
            <h2>Start a conversation.</h2>
            <p>
              For player trials, academy applications, media and community
              programmes, email the club.
            </p>
            <a className="contact-email" href={emailLink()}>
              {club.email}
            </a>
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
            <address>{club.address}</address>
            <p>Registration No. {club.registration}</p>
            <div className="contact-route">
              <h3>Partnerships</h3>
              <p>Grow with a young, winning club from the Northeast.</p>
              <Link href="/partners">
                Explore partnerships <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="contact-route">
              <h3>Careers</h3>
              <p>
                Explore the club’s technical and medical staff opportunities.
              </p>
              <Link href="/careers">
                View roles and application details{" "}
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
