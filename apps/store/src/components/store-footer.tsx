import Link from "next/link";

export function StoreFooter() {
  return (
    <footer className="store-footer">
      <div className="store-footer-inner">
        {/* Top Section: Links Grid */}
        <div className="sf-links-grid">
          {/* Column 1: Brand & Social */}
          <div className="sf-col sf-brand-col">
            <div className="sf-logo">
              <img src="/crest.png" alt="NUSC Crest" className="h-10 w-10 object-contain" />
              <div className="sf-logo-text">
                <strong>NUSC</strong>
                <span>STORE</span>
              </div>
            </div>
            <p className="sf-desc">
              The official home of club kits and fan merchandise. Wear your colours with pride.
            </p>
            <div className="sf-season-badge">
              <span>SEASON 26/27</span>
            </div>
            <div className="sf-social">
              <Link href="#" aria-label="X (Twitter)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z" /><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" /></svg>
              </Link>
              <Link href="#" aria-label="Instagram">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
              </Link>
              <Link href="#" aria-label="Facebook">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
              </Link>
              <Link href="#" aria-label="YouTube">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>
              </Link>
            </div>
          </div>

          {/* Column 2: SHOP */}
          <div className="sf-col">
            <h4 className="sf-heading">SHOP</h4>
            <nav className="sf-nav">
              <Link href="#">Home Kits</Link>
              <Link href="#">Away Kits</Link>
              <Link href="#">Third Kits</Link>
              <Link href="#">Training Wear</Link>
              <Link href="#">Goalkeeper Kits</Link>
              <Link href="#">Limited Editions</Link>
            </nav>
          </div>

          {/* Column 3: CLUB */}
          <div className="sf-col">
            <h4 className="sf-heading">CLUB</h4>
            <nav className="sf-nav">
              <Link href="#">About the Club</Link>
              <Link href="#">First Team</Link>
              <Link href="#">Academy</Link>
              <Link href="#">Women's Team</Link>
              <Link href="#">Club History</Link>
              <Link href="#">Stadium Tours</Link>
            </nav>
          </div>

          {/* Column 4: HELP */}
          <div className="sf-col">
            <h4 className="sf-heading">HELP</h4>
            <nav className="sf-nav">
              <Link href="#">Size Guide</Link>
              <Link href="#">Delivery Info</Link>
              <Link href="#">Returns & Refunds</Link>
              <Link href="#">Track My Order</Link>
              <Link href="#">FAQs</Link>
              <Link href="#">Contact Us</Link>
            </nav>
          </div>

          {/* Column 5: MEMBERSHIP */}
          <div className="sf-col">
            <h4 className="sf-heading">MEMBERSHIP</h4>
            <nav className="sf-nav">
              <Link href="#">Season Tickets</Link>
              <Link href="#">Fan Club</Link>
              <Link href="#">Loyalty Points</Link>
              <Link href="#">Gift Cards</Link>
              <Link href="#">Corporate Packages</Link>
            </nav>
          </div>
        </div>

        {/* Middle Section: Newsletter */}
        <div className="sf-newsletter">
          <div className="sf-nl-text">
            <h3 className="sf-nl-title">Get early access to new kits & exclusive offers</h3>
          </div>
          <form className="sf-nl-form">
            <input type="email" placeholder="EMAIL ADDRESS" required />
            <button type="submit">SUBSCRIBE</button>
          </form>
        </div>

        {/* Partners Section */}
        <div className="sf-partners-section">
          <div className="sf-partners-grid">
            <div className="sf-partner-placeholder">KIT SPONSOR</div>
            <div className="sf-partner-placeholder">SHIRT PARTNER</div>
            <div className="sf-partner-placeholder">OFFICIAL KIT SUPPLIER</div>
            <div className="sf-partner-placeholder">APPAREL PARTNER</div>
          </div>
        </div>

        {/* Bottom Section: Legal */}
        <div className="sf-legal">
          <div className="sf-copyright">
            &copy; 2026 KITSHOP &mdash; OFFICIAL CLUB STORE. ALL RIGHTS RESERVED.
          </div>
          <div className="sf-legal-links">
            <Link href="#">Privacy Policy</Link>
            <Link href="#">Terms of Use</Link>
            <Link href="#">Cookie Settings</Link>
            <Link href="#">Accessibility</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
