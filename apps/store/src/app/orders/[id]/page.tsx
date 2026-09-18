import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Package, Truck, CheckCircle2 } from "lucide-react";

export default function OrderDetailsPage({ params }: { params: { id: string } }) {
  // Mock data for the specific order. In a real app, this would be fetched based on params.id
  const order = {
    id: params.id,
    date: "Sep 17, 2026",
    status: "Processing",
    paymentMethod: "UPI / Net Banking",
    shippingAddress: {
      name: "John Doe",
      street: "123 Stadium Road",
      city: "Dimapur",
      state: "Nagaland",
      zip: "797112"
    },
    subtotal: "₹ 1,899",
    shipping: "FREE",
    total: "₹ 1,899",
    items: [
      { id: 1, name: "NUSC 2026 HOME KIT", size: "M", price: "₹ 1,899", image: "/images/jersey (4).jpg" }
    ]
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Processing":
        return <Package size={16} />;
      case "Shipped":
        return <Truck size={16} />;
      case "Delivered":
        return <CheckCircle2 size={16} />;
      default:
        return null;
    }
  };

  return (
    <div className="order-details-page">
      <div className="order-details-container">
        
        <div className="order-details-header">
          <Link href="/orders" className="back-to-orders-link">
            <ArrowLeft size={16} /> Back to My Orders
          </Link>
          <div className="order-details-title-row">
            <h1 className="order-details-title">Order #{order.id}</h1>
            <div className={`order-status-badge ${order.status.toLowerCase()}`}>
              {getStatusIcon(order.status)}
              <span>{order.status}</span>
            </div>
          </div>
          <p className="order-date-text">Placed on {order.date}</p>
        </div>

        <div className="order-details-grid">
          
          <div className="order-details-left">
            <h2 className="details-section-title">Items Ordered</h2>
            <div className="checkout-cart-items">
              {order.items.map(item => (
                <div key={item.id} className="checkout-cart-item">
                  <div className="checkout-cart-img-wrap">
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
          </div>

          <div className="order-details-right">
            <div className="checkout-card-details">
              <h2 className="details-section-title">Shipping Address</h2>
              <div className="address-block">
                <p><strong>{order.shippingAddress.name}</strong></p>
                <p>{order.shippingAddress.street}</p>
                <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</p>
              </div>
            </div>

            <div className="checkout-card-details" style={{ marginTop: '16px' }}>
              <h2 className="details-section-title">Payment Method</h2>
              <div className="payment-block">
                <p>{order.paymentMethod}</p>
              </div>
            </div>

            <div className="checkout-card-details" style={{ marginTop: '16px' }}>
              <h2 className="details-section-title">Order Summary</h2>
              
              <div className="checkout-summary-lines" style={{ padding: '0', border: 'none', margin: '0' }}>
                <div className="checkout-summary-line">
                  <span>Subtotal</span>
                  <span>{order.subtotal}</span>
                </div>
                <div className="checkout-summary-line">
                  <span>Shipping</span>
                  <span>{order.shipping}</span>
                </div>
              </div>
              
              <div className="checkout-summary-total" style={{ borderTop: '1px solid var(--line-l)', paddingTop: '16px', marginTop: '8px' }}>
                <span>Total</span>
                <span>{order.total}</span>
              </div>
            </div>
            
          </div>

        </div>
      </div>
    </div>
  );
}
