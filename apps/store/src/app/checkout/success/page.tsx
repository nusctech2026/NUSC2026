import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Package, Truck, ArrowRight } from "lucide-react";

export default function OrderSuccessPage() {
  const cartItems = [
    {
      id: 1,
      name: "NUSC 2026 Home Kit",
      size: "M",
      price: "₹ 1,899",
      quantity: 1,
      image: "/images/jersey (4).jpg"
    }
  ];

  return (
    <div className="checkout-page">
      <div className="checkout-header">
        <Link href="/" className="checkout-logo">NUSC STORE</Link>
      </div>

      <div className="success-container">
        <div className="success-icon-wrapper">
          <CheckCircle2 size={64} className="success-icon" />
        </div>
        
        <h1 className="success-title">Order Confirmed</h1>
        <p className="success-subtitle">Thank you for your purchase. We've received your order and will begin processing it shortly.</p>
        
        <div className="success-details-grid">
          <div className="success-detail-box">
            <span className="detail-label">Order Number</span>
            <span className="detail-value">#NUSC-847291</span>
          </div>
          <div className="success-detail-box">
            <span className="detail-label">Delivery Estimate</span>
            <span className="detail-value">3-5 Business Days</span>
          </div>
        </div>

        <div className="success-summary">
          <h2 className="success-summary-title">Order Summary</h2>
          <div className="success-items">
            {cartItems.map((item) => (
              <div key={item.id} className="success-item">
                <div className="success-item-image">
                  <Image src={item.image} alt={item.name} fill style={{ objectFit: "cover" }} sizes="80px" />
                </div>
                <div className="success-item-details">
                  <span className="success-item-name">{item.name}</span>
                  <span className="success-item-meta">Size: {item.size} • Qty: {item.quantity}</span>
                </div>
                <div className="success-item-price">{item.price}</div>
              </div>
            ))}
          </div>
          <div className="success-total">
            <span>Total Paid</span>
            <span>₹ 1,899</span>
          </div>
        </div>

        <div className="success-next-steps">
          <div className="next-step">
            <Package size={24} />
            <div>
              <h3>Processing</h3>
              <p>We are currently packing your order</p>
            </div>
          </div>
          <div className="step-divider" />
          <div className="next-step pending">
            <Truck size={24} />
            <div>
              <h3>Shipping</h3>
              <p>You will receive a tracking link via email</p>
            </div>
          </div>
        </div>

        <div className="success-actions">
          <Link href="/" className="checkout-submit-btn">
            CONTINUE SHOPPING <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </div>
  );
}
