import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Package, Truck, CheckCircle2 } from "lucide-react";

export default function MyOrdersPage() {
  const orders = [
    {
      id: "NUSC-847291",
      date: "Sep 17, 2026",
      status: "Processing",
      total: "₹ 1,899",
      items: [
        { id: 1, name: "NUSC 2026 Home Kit", size: "M", image: "/images/jersey (4).jpg" }
      ]
    },
    {
      id: "NUSC-835102",
      date: "Aug 02, 2026",
      status: "Delivered",
      total: "₹ 2,498",
      items: [
        { id: 2, name: "NUSC TRAINING T-SHIRT", size: "L", image: "/images/jersey (6).jpg" },
        { id: 3, name: "NUSC FAN TEE", size: "L", image: "/images/jersey (7).jpg" }
      ]
    }
  ];

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
    <div className="orders-page">
      <div className="orders-container">
        <div className="orders-header-wrap">
          <h1 className="orders-page-title">My Orders</h1>
          <p className="orders-page-subtitle">View and track your current and past orders.</p>
        </div>

        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-card-header">
                <div className="order-meta">
                  <div className="order-meta-item">
                    <span className="order-meta-label">Order Number</span>
                    <span className="order-meta-value">#{order.id}</span>
                  </div>
                  <div className="order-meta-item">
                    <span className="order-meta-label">Date Placed</span>
                    <span className="order-meta-value">{order.date}</span>
                  </div>
                  <div className="order-meta-item">
                    <span className="order-meta-label">Total Amount</span>
                    <span className="order-meta-value amount">{order.total}</span>
                  </div>
                </div>
                
                <div className={`order-status status-${order.status.toLowerCase()}`}>
                  {getStatusIcon(order.status)}
                  <span>{order.status}</span>
                </div>
              </div>

              <div className="order-card-body">
                <div className="order-items-preview">
                  {order.items.map((item) => (
                    <div key={item.id} className="order-item-thumb">
                      <Image 
                        src={item.image} 
                        alt={item.name} 
                        fill 
                        style={{ objectFit: "cover" }} 
                        sizes="80px"
                      />
                    </div>
                  ))}
                  {order.items.length > 0 && (
                    <div className="order-items-desc">
                      <span className="items-count">
                        {order.items.length} {order.items.length === 1 ? 'Item' : 'Items'}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="order-card-actions">
                  <Link href={`/checkout/success`} className="view-order-btn">
                    View Details <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
