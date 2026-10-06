"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, CreditCard, Lock, CheckCircle2, Loader2 } from "lucide-react";
import { useCart } from "@/lib/store";
import { createOrder } from "../actions/order";

export default function CheckoutPage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);
  
  const { items: cartItems, cartTotal, clearCart } = useCart();
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    postalCode: "",
  });

  const relatedProducts = [
    { id: 1, name: "NUSC TRAINING T-SHIRT", price: "₹ 1,499", image: "/images/jersey (6).jpg" },
    { id: 2, name: "NUSC FAN TEE", price: "₹ 999", image: "/images/jersey (7).jpg" },
    { id: 3, name: "NUSC GRAPHIC TEE", price: "₹ 1,199", image: "/images/jersey (8).jpg" },
    { id: 4, name: "NUSC AWAY KIT 2026", price: "₹ 1,519", originalPrice: "₹ 1,899", image: "/images/jersey (9).jpg", discount: "-20%" },
  ];

  if (!mounted) return null;

  const total = cartTotal();

  const handlePlaceOrder = async () => {
    // Basic Validation
    if (cartItems.length === 0) {
      setErrors({ payment: "Your cart is empty." });
      return;
    }
    if (!formData.firstName || !formData.lastName || !formData.address || !formData.city || !formData.postalCode) {
      setErrors({ form: "Please fill in all shipping details." });
      return;
    }
    
    setIsProcessing(true);
    setErrors({});

    const items = cartItems.map(item => ({
      variant_id: item.id,
      quantity: item.quantity
    }));

    const shippingAddress = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      address_line1: formData.address,
      city: formData.city,
      postal_code: formData.postalCode,
      country: "IN"
    };

    // Generate a random UUID for idempotency_key
    const idempotencyKey = crypto.randomUUID();

    const res = await createOrder(idempotencyKey, items, shippingAddress);

    setIsProcessing(false);

    if (res?.error) {
      setErrors({ payment: res.error });
      return;
    }

    clearCart();
    router.push('/checkout/success');
  };

  return (
    <div className="checkout-page">
      <div className="checkout-header">
        <Link href="/" className="checkout-logo">NUSC STORE</Link>
        <div className="checkout-secure">
          <Lock size={16} /> Secure Checkout
        </div>
      </div>

      <div className="checkout-container">
        <div className="checkout-main">
          
          <div className="checkout-section">
            <h2 className="checkout-section-title">1. Shipping Address</h2>
            {errors.form && <div style={{ color: 'var(--red)', marginBottom: '16px', fontSize: '0.9rem' }}>{errors.form}</div>}
            <div className="checkout-form-grid">
              <div className="checkout-input-group half-width">
                <label>First Name</label>
                <input type="text" placeholder="First Name" className="checkout-input" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
              </div>
              <div className="checkout-input-group half-width">
                <label>Last Name</label>
                <input type="text" placeholder="Last Name" className="checkout-input" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
              </div>
              <div className="checkout-input-group full-width">
                <label>Address</label>
                <input type="text" placeholder="Street Address" className="checkout-input" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <div className="checkout-input-group half-width">
                <label>City</label>
                <input type="text" placeholder="City" className="checkout-input" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
              </div>
              <div className="checkout-input-group half-width">
                <label>Postal Code</label>
                <input type="text" placeholder="Postal Code" className="checkout-input" value={formData.postalCode} onChange={e => setFormData({...formData, postalCode: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="checkout-section">
            <h2 className="checkout-section-title">2. Payment Method</h2>
            <div className="checkout-payment-methods">
              <label className="checkout-payment-option selected">
                <input type="radio" name="payment" defaultChecked />
                <span className="checkout-payment-label">
                  <CreditCard size={20} /> Pay on Delivery
                </span>
                <CheckCircle2 size={20} className="checkout-payment-check" />
              </label>
            </div>
            <p style={{ marginTop: '12px', fontSize: '0.9rem', color: 'var(--muted)' }}>
              Online payments will be integrated with Razorpay soon.
            </p>
          </div>

        </div>

        <div className="checkout-sidebar">
          <div className="checkout-summary-box">
            <h2 className="checkout-summary-title">Order Summary</h2>
            
            <div className="checkout-cart-items">
              {cartItems.map(item => (
                <div key={item.id} className="checkout-cart-item">
                  <div className="checkout-cart-img-wrap">
                    <span className="checkout-cart-badge">{item.quantity}</span>
                    <div className="checkout-cart-img">
                      {item.image && <Image src={item.image} alt={item.name} fill style={{ objectFit: 'cover' }} />}
                    </div>
                  </div>
                  <div className="checkout-cart-info">
                    <h3>{item.name}</h3>
                    <p>Size: {item.size || 'N/A'}</p>
                  </div>
                  <div className="checkout-cart-price">
                    ₹ {(item.price / 100).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
              {cartItems.length === 0 && <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>Your cart is empty.</p>}
            </div>

            <div className="checkout-summary-lines">
              <div className="checkout-summary-line">
                <span>Subtotal</span>
                <span>₹ {(total / 100).toLocaleString('en-IN')}</span>
              </div>
              <div className="checkout-summary-line">
                <span>Shipping</span>
                <span>FREE</span>
              </div>
            </div>
            
            <div className="checkout-summary-total">
              <span>Total</span>
              <span>₹ {(total / 100).toLocaleString('en-IN')}</span>
            </div>

            {errors.payment && (
              <div style={{ background: '#FEF2F2', border: '1px solid var(--red)', color: 'var(--red)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.95rem' }}>
                <strong style={{ display: 'block', marginBottom: '4px' }}>Checkout Failed</strong>
                {errors.payment}
              </div>
            )}

            <button 
              className="checkout-submit-btn" 
              onClick={handlePlaceOrder}
              disabled={isProcessing || cartItems.length === 0}
            >
              PLACE ORDER <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {isProcessing && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'white',
            padding: '40px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}>
            <Loader2 size={48} className="lucide-spin" style={{ color: 'var(--red)' }} />
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--navy-900)', marginBottom: '8px' }}>Processing Order</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.95rem', maxWidth: '280px' }}>
                Please don't close this window or click the back button.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Related Products Section */}
      <div className="pdp-related-section" style={{ maxWidth: '1200px', margin: '80px auto 0', padding: '0 20px' }}>
        <h2 className="pdp-related-title">YOU MAY ALSO LIKE</h2>
        <div className="pdp-related-grid">
          {relatedProducts.map(item => (
            <div key={item.id} className="pdp-related-card">
              <div className="pdp-related-img-wrap">
                {item.discount && <span className="pdp-related-discount">{item.discount}</span>}
                <Image src={item.image} alt={item.name} fill style={{ objectFit: 'contain' }} />
              </div>
              <h3 className="pdp-related-name">{item.name}</h3>
              <div className="pdp-related-price-wrap">
                <span className="pdp-related-price">{item.price}</span>
                {item.originalPrice && <span className="pdp-related-original-price">{item.originalPrice}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
