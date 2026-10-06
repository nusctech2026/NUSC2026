"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Package } from "lucide-react";

export default function OrdersPage() {
  const [filter, setFilter] = useState("All");

  const orders = [
    {
      id: "NUSC1024",
      date: "24 Sep 2026",
      status: "Shipped",
      total: "₹ 1,599",
      items: [
        { name: "NUSC 2026/27 Home Jersey", size: "M", qty: 1, image: "/images/jersey (4).jpg" }
      ]
    },
    {
      id: "NUSC0945",
      date: "12 Aug 2026",
      status: "Delivered",
      total: "₹ 3,200",
      items: [
        { name: "NUSC 2026/27 Away Jersey", size: "L", qty: 1, image: "/images/jersey (5).jpg" },
        { name: "NUSC Training Cap", size: "One Size", qty: 1, image: "/images/jersey (5).jpg" }
      ]
    },
    {
      id: "NUSC0812",
      date: "05 May 2026",
      status: "Delivered",
      total: "₹ 899",
      items: [
        { name: "NUSC Scarf", size: "One Size", qty: 1, image: "/images/jersey (4).jpg" }
      ]
    },
    {
      id: "NUSC0799",
      date: "01 May 2026",
      status: "Cancelled",
      total: "₹ 1,899",
      items: [
        { name: "NUSC 2026 Home Kit", size: "L", qty: 1, image: "/images/jersey (1).jpg" }
      ]
    }
  ];

  const filteredOrders = filter === "All" 
    ? orders 
    : orders.filter(order => order.status === filter);

  return (
    <>
      <h1 className="account-section-title">My Orders</h1>
      <p className="account-section-desc">
        View and track your previous orders.
      </p>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {["All", "Processing", "Shipped", "Delivered", "Cancelled"].map((status) => (
          <button 
            key={status}
            onClick={() => setFilter(status)}
            style={{ 
              padding: '8px 16px', 
              background: filter === status ? 'var(--navy-900)' : 'var(--paper)', 
              color: filter === status ? 'white' : 'var(--ink)', 
              border: 'none', 
              borderRadius: '4px', 
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {status === "All" ? "All Orders" : status}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <EmptyState 
          icon={<Package size={48} color="var(--line-l)" />}
          title={filter === "All" ? "No orders yet" : `No ${filter.toLowerCase()} orders`}
          description={filter === "All" ? "You haven't placed any orders yet. Start exploring our store to find your gear." : `You don't have any orders with the status "${filter}".`}
          actionText="Start Shopping"
          actionHref="/search"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {filteredOrders.map((order) => (
            <div key={order.id} style={{ border: '1px solid var(--line-l)', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ background: 'var(--paper)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Placed</div>
                  <div style={{ fontWeight: 600 }}>{order.date}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</div>
                  <div style={{ fontWeight: 600 }}>{order.total}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order #</div>
                  <div style={{ fontWeight: 600 }}>{order.id}</div>
                </div>
                <Link href={`/account/orders/${order.id}`} style={{ padding: '8px 16px', border: '1px solid var(--line-l)', background: 'white', borderRadius: '4px', fontWeight: 600, color: 'var(--navy-900)', textDecoration: 'none' }}>
                  View Details
                </Link>
              </div>
              
              <div style={{ padding: '24px' }}>
                <div style={{ fontWeight: 600, color: 'var(--navy-900)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    background: order.status === 'Delivered' ? '#10B981' : order.status === 'Cancelled' ? 'var(--red)' : order.status === 'Shipped' ? 'var(--navy-900)' : '#F59E0B'
                  }}></div>
                  {order.status}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', opacity: order.status === 'Cancelled' ? 0.6 : 1 }}>
                  {order.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ width: '80px', height: '100px', position: 'relative', background: 'var(--paper)' }}>
                        <Image src={item.image} alt={item.name} fill style={{ objectFit: 'cover', filter: order.status === 'Cancelled' ? 'grayscale(1)' : 'none' }} />
                      </div>
                      <div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', textDecoration: order.status === 'Cancelled' ? 'line-through' : 'none' }}>{item.name}</h3>
                        <div style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '4px' }}>Size: {item.size}</div>
                        <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Qty: {item.qty}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
