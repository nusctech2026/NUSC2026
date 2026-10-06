"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import "./legal.css";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const links = [
    { name: "Privacy Policy", href: "/legal/privacy-policy" },
    { name: "Terms of Service", href: "/legal/terms" },
    { name: "Returns & Refunds", href: "/legal/returns" },
    { name: "Shipping Policy", href: "/legal/shipping" },
  ];

  return (
    <div className="legal-container">
      <aside className="legal-sidebar">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`legal-sidebar-link ${pathname === link.href ? "active" : ""}`}
          >
            {link.name}
          </Link>
        ))}
      </aside>
      <main className="legal-content">
        {children}
      </main>
    </div>
  );
}
