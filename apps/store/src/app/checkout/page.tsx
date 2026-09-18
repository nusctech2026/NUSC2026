import Image from "next/image";
import Link from "next/link";
import { ChevronRight, CreditCard, Lock, CheckCircle2 } from "lucide-react";

export default function CheckoutPage() {
  const cartItems = [
    {
      id: 1,
      name: "NUSC 2026 Home Kit",
      size: "M",
      price: "₹ 1,899",
      quantity: 1,
      image: "/images/jersey (4).jpg"
    },
    {
      id: 2,
      name: "NUSC TRAINING T-SHIRT",
      size: "L",
      price: "₹ 1,499",
      quantity: 1,
      image: "/images/jersey (6).jpg"
    }
  ];

  const relatedProducts = [
    { id: 1, name: "NUSC TRAINING T-SHIRT", price: "₹ 1,499", image: "/images/jersey (6).jpg" },
    { id: 2, name: "NUSC FAN TEE", price: "₹ 999", image: "/images/jersey (7).jpg" },
    { id: 3, name: "NUSC GRAPHIC TEE", price: "₹ 1,199", image: "/images/jersey (8).jpg" },
    { id: 4, name: "NUSC AWAY KIT 2026", price: "₹ 1,519", originalPrice: "₹ 1,899", image: "/images/jersey (9).jpg", discount: "-20%" },
  ];

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
            <h2 className="checkout-section-title">1. Contact Information</h2>
            <div className="checkout-form-grid">
              <div className="checkout-input-group full-width">
                <label>Email Address</label>
                <input type="email" placeholder="Enter your email" className="checkout-input" />
              </div>
            </div>
          </div>

          <div className="checkout-section">
            <h2 className="checkout-section-title">2. Shipping Address</h2>
            <div className="checkout-form-grid">
              <div className="checkout-input-group half-width">
                <label>First Name</label>
                <input type="text" placeholder="First Name" className="checkout-input" />
              </div>
              <div className="checkout-input-group half-width">
                <label>Last Name</label>
                <input type="text" placeholder="Last Name" className="checkout-input" />
              </div>
              <div className="checkout-input-group full-width">
                <label>Address</label>
                <input type="text" placeholder="Street Address" className="checkout-input" />
              </div>
              <div className="checkout-input-group half-width">
                <label>City</label>
                <input type="text" placeholder="City" className="checkout-input" />
              </div>
              <div className="checkout-input-group half-width">
                <label>Postal Code</label>
                <input type="text" placeholder="Postal Code" className="checkout-input" />
              </div>
            </div>
          </div>

          <div className="checkout-section">
            <h2 className="checkout-section-title">3. Payment Method</h2>
            <div className="checkout-payment-methods">
              <label className="checkout-payment-option selected">
                <input type="radio" name="payment" defaultChecked />
                <span className="checkout-payment-label">
                  <CreditCard size={20} /> Credit / Debit Card
                </span>
                <CheckCircle2 size={20} className="checkout-payment-check" />
              </label>
              <label className="checkout-payment-option">
                <input type="radio" name="payment" />
                <span className="checkout-payment-label">
                  UPI / Net Banking
                </span>
              </label>
            </div>
            
            <div className="checkout-card-details">
              <div className="checkout-input-group full-width">
                <label>Card Number</label>
                <input type="text" placeholder="0000 0000 0000 0000" className="checkout-input" />
              </div>
              <div className="checkout-form-grid">
                <div className="checkout-input-group half-width">
                  <label>Expiry Date</label>
                  <input type="text" placeholder="MM/YY" className="checkout-input" />
                </div>
                <div className="checkout-input-group half-width">
                  <label>CVV</label>
                  <input type="password" placeholder="123" className="checkout-input" />
                </div>
              </div>
            </div>
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
                      <Image src={item.image} alt={item.name} fill style={{ objectFit: 'cover' }} />
                    </div>
                  </div>
                  <div className="checkout-cart-info">
                    <h3>{item.name}</h3>
                    <p>Size: {item.size}</p>
                  </div>
                  <div className="checkout-cart-price">
                    {item.price}
                  </div>
                </div>
              ))}
            </div>

            <div className="checkout-summary-lines">
              <div className="checkout-summary-line">
                <span>Subtotal</span>
                <span>₹ 3,398</span>
              </div>
              <div className="checkout-summary-line">
                <span>Shipping</span>
                <span>FREE</span>
              </div>
            </div>
            
            <div className="checkout-summary-total">
              <span>Total</span>
              <span>₹ 3,398</span>
            </div>

            <button className="checkout-submit-btn">
              PLACE ORDER <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

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
