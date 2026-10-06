"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { EmptyState } from "./empty-state";

export function Cart() {
  const [isOpen, setIsOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [cartItems, setCartItems] = useState([
    { id: 1, name: "NUSC 2026 Home Kit", size: "M", price: "₹ 1,899", image: "/images/jersey (1).jpg" }
  ]);

  const removeItem = (id: number) => {
    setCartItems(items => items.filter(i => i.id !== id));
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 4000);
  };

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
        
        <div className="cart-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
          {cartItems.length === 0 ? (
            <div style={{ margin: 'auto 0' }}>
              <EmptyState 
                title="Your cart is empty" 
                description="Looks like you haven't added any gear to your cart yet."
                onActionClick={() => setIsOpen(false)}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {cartItems.map(item => (
                <div key={item.id} style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ width: '80px', height: '100px', background: 'var(--paper)', position: 'relative' }}>
                    <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>{item.name}</h3>
                    <div style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '8px' }}>Size: {item.size}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>{item.price}</span>
                      <button 
                        onClick={() => removeItem(item.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--muted)', textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cart-footer">
          <div className="cart-summary-row">
            <span className="text-muted">Shipping</span>
            <span className="text-muted">At Checkout</span>
          </div>
          <div className="cart-summary-row total">
            <span>Subtotal</span>
            <span>₹ {cartItems.length > 0 ? '1,899' : '0'}</span>
          </div>
          <button className="btn-cart-checkout" disabled={cartItems.length === 0}>Checkout</button>
        </div>
      </div>

      {showToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--navy-900)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
          zIndex: 9999,
          fontWeight: 500,
          animation: 'slideUp 0.3s ease-out forwards'
        }}>
          Item removed from cart. 
          <button 
            onClick={() => {
              setCartItems([{ id: 1, name: "NUSC 2026 Home Kit", size: "M", price: "₹ 1,899", image: "/images/jersey (1).jpg" }]);
              setShowToast(false);
            }} 
            style={{ background: 'none', border: 'none', color: '#10B981', fontWeight: 600, cursor: 'pointer', marginLeft: '8px' }}
          >
            Undo
          </button>
        </div>
      )}
    </>
  );
}
