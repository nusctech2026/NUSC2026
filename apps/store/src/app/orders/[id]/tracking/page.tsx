import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Package, Truck, Home } from "lucide-react";

export default function OrderTrackingPage({ params }: { params: { id: string } }) {
  // Mock tracking data
  const orderId = params.id;
  const courier = "BlueDart Express";
  const trackingNumber = "BD9827364510";
  const expectedDelivery = "Sep 20, 2026";
  const items = [
    { id: 1, name: "NUSC 2026 HOME KIT", size: "M", price: "₹ 1,899", image: "/images/jersey (4).jpg" }
  ];
  
  const timeline = [
    {
      id: 1,
      title: "Order Placed",
      date: "Sep 17, 2026 - 10:45 AM",
      completed: true,
      icon: <Package size={20} />
    },
    {
      id: 2,
      title: "Processing",
      date: "Sep 17, 2026 - 2:30 PM",
      completed: true,
      icon: <Package size={20} />
    },
    {
      id: 3,
      title: "Shipped",
      date: "Sep 18, 2026 - 9:15 AM",
      completed: true,
      icon: <Truck size={20} />
    },
    {
      id: 4,
      title: "Out for Delivery",
      date: "Pending",
      completed: false,
      icon: <Truck size={20} />
    },
    {
      id: 5,
      title: "Delivered",
      date: "Expected by Sep 20",
      completed: false,
      icon: <Home size={20} />
    }
  ];

  return (
    <div className="tracking-page">
      <div className="tracking-container">
        
        <div className="tracking-header">
          <Link href={`/orders/${orderId}`} className="back-to-orders-link">
            <ArrowLeft size={16} /> Back to Order
          </Link>
          <div className="tracking-title-row">
            <h1 className="tracking-title">Tracking #{orderId}</h1>
          </div>
          <p className="tracking-status-text">Arriving by {expectedDelivery}</p>
        </div>

        <div className="tracking-courier-box">
          <h2 className="details-section-title">Items in Shipment</h2>
          <div className="checkout-cart-items" style={{ border: 'none', margin: '0', padding: '0' }}>
            {items.map(item => (
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

        <div className="tracking-courier-box">
          <h2 className="details-section-title">Courier Information</h2>
          <div className="courier-details">
            <div className="courier-item">
              <span className="courier-label">Courier Partner</span>
              <span className="courier-value">{courier}</span>
            </div>
            <div className="courier-item">
              <span className="courier-label">Tracking Number</span>
              <span className="courier-value">{trackingNumber}</span>
            </div>
          </div>
        </div>

        <div className="tracking-timeline-box">
          <h2 className="details-section-title">Shipment Progress</h2>
          <div className="tracking-timeline">
            {timeline.map((step, index) => (
              <div key={step.id} className={`timeline-step ${step.completed ? 'completed' : 'pending'}`}>
                <div className="timeline-marker">
                  <div className="timeline-icon">
                    {step.completed ? <CheckCircle2 size={16} /> : <div className="timeline-dot" />}
                  </div>
                  {index < timeline.length - 1 && <div className="timeline-line"></div>}
                </div>
                <div className="timeline-content">
                  <h3 className="timeline-step-title">{step.title}</h3>
                  <p className="timeline-step-date">{step.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
