"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function Wishlist() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        aria-label="Favorites" 
        className="icon-btn"
        onClick={() => setIsOpen(true)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>

      <div 
        className={`cart-backdrop ${isOpen ? "open" : ""}`} 
        onClick={() => setIsOpen(false)}
        aria-hidden={!isOpen}
      />

      <div 
        className={`cart-drawer ${isOpen ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Your wishlist"
      >
        <div className="cart-header">
          <h2>Your wishlist</h2>
          <button 
            onClick={() => setIsOpen(false)} 
            aria-label="Close wishlist" 
            className="close-cart-btn"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="cart-body">
          {/* Wishlist items would go here */}
        </div>

        <div className="cart-footer">
          <button className="btn-cart-checkout">View All Favorites</button>
        </div>
      </div>
    </>
  );
}
