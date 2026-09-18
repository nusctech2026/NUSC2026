"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mobile-nav-container">
      <button 
        aria-label="Open menu" 
        className="icon-btn mobile-menu-btn"
        onClick={() => setIsOpen(true)}
      >
        <Menu size={24} />
      </button>

      <div 
        className={`cart-backdrop ${isOpen ? "open" : ""}`} 
        onClick={() => setIsOpen(false)}
        aria-hidden={!isOpen}
      />

      <div 
        className={`mobile-drawer ${isOpen ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        <div className="cart-header">
          <h2>Menu</h2>
          <button 
            onClick={() => setIsOpen(false)} 
            aria-label="Close menu" 
            className="close-cart-btn"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="mobile-nav-links">
          <Link href="#match-kits" onClick={() => setIsOpen(false)}>Match Kits</Link>
          <Link href="#training-wear" onClick={() => setIsOpen(false)}>Training Wear</Link>
          <Link href="#accessories" onClick={() => setIsOpen(false)}>Accessories</Link>
          <hr className="mobile-nav-divider" />
          <Link href="#" onClick={() => setIsOpen(false)}>Our Story</Link>
          <Link href="#" onClick={() => setIsOpen(false)}>Sell Your Collection</Link>
          <Link href="#" onClick={() => setIsOpen(false)}>Help Center</Link>
        </div>
      </div>
    </div>
  );
}
