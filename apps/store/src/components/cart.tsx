"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function Cart() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        aria-label="Cart" 
        className="icon-btn bag-btn" 
        onClick={() => setIsOpen(true)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
        <span className="cart-badge">0</span>
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
        aria-label="Your cart"
      >
        <div className="cart-header">
          <h2>Your cart</h2>
          <button 
            onClick={() => setIsOpen(false)} 
            aria-label="Close cart" 
            className="close-cart-btn"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="cart-body">
          {/* Cart items would go here */}
        </div>

        <div className="cart-footer">
          <div className="cart-summary-row">
            <span className="text-muted">Shipping</span>
            <span className="text-muted">At Checkout</span>
          </div>
          <div className="cart-summary-row total">
            <span>Subtotal</span>
            <span>IDR 0</span>
          </div>
          <button className="btn-cart-checkout">Checkout</button>
        </div>
      </div>
    </>
  );
}
