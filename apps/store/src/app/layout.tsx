import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import Link from "next/link";
import Script from "next/script";
import { club } from "@/content/site";
import { StoreFooter } from "@/components/store-footer";
import { Cart } from "@/components/cart";
import { Wishlist } from "@/components/wishlist";
import { MobileNav } from "@/components/mobile-nav";
import { SmoothScrolling } from "@/components/SmoothScrolling";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});
const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `Shop | ${club.shortName}`,
    template: `%s | ${club.shortName} Shop`,
  },
  description:
    "Frontend preview for the official NUSC merchandise store. Products, prices and stock await club approval.",
  icons: { icon: "/crest.png", apple: "/crest.png" },
};
export const viewport: Viewport = { themeColor: "#081936" };

export default function StoreLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${barlow.variable}`}
    >
      <body suppressHydrationWarning>
        <SmoothScrolling>
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <header className="store-nav-wrapper">
            <div className="store-top-bar">
              <div className="top-bar-left">
                <Link href="#">Our Story</Link>
                <Link href="#">Sell Your Collection</Link>
                <Link href="#">Help Center</Link>
              </div>
              <div className="top-bar-right">
                <span>Follow us: </span>
                <a href="#" aria-label="Facebook"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg></a>
                <a href="#" aria-label="Instagram"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg></a>
                <a href="#" aria-label="TikTok"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" /></svg></a>
                <a href="#" aria-label="X (Twitter)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z" /><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" /></svg></a>
                {/* <span className="divider"></span> */}
                {/* <button className="lang-currency">EN-IDR <span>▼</span></button> */}
              </div>
            </div>
            <div className="store-main-header">
              <div className="header-left-wrap-new">
                <MobileNav />
                <button aria-label="Search" className="icon-btn search-mobile">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                </button>
                <Link className="store-brand-new" href="/" aria-label="Home">
                  <span className="store-brand-mark-new" aria-hidden="true" />
                </Link>
                <nav className="store-nav-links-new" aria-label="Main Navigation">
                  <Link href="#match-kits">Match Kits</Link>
                  <Link href="#training-wear">Training Wear</Link>
                  <Link href="#accessories">Accessories</Link>
                </nav>
              </div>
              <div className="store-nav-actions-new" aria-label="Store tools">
                <button aria-label="Search" className="icon-btn search-desktop">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                </button>
                <span className="mobile-hidden">
                  <Wishlist />
                </span>
                <Cart />
                <button aria-label="Account" className="icon-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </button>
              </div>
            </div>
          </header>
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <StoreFooter />
          <Script
            id="scroll-listener"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.addEventListener('scroll', () => {
                  if (window.scrollY > 40) {
                    document.body.classList.add('scrolled');
                  } else {
                    document.body.classList.remove('scrolled');
                  }
                });
              `
            }}
          />
        </SmoothScrolling>
      </body>
    </html>
  );
}
