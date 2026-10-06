"use client";

import Image from "next/image";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";

import { use } from "react";

export default function ShopPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const resolvedParams = use(searchParams);
  const allProducts = [
    { id: 1, name: "NUSC 2026 HOME KIT", price: "₹ 1,899", image: "/images/jersey (4).jpg" },
    { id: 2, name: "NUSC 2026 AWAY KIT", price: "₹ 1,899", image: "/images/jersey (5).jpg" },
    { id: 3, name: "NUSC TRAINING T-SHIRT", price: "₹ 1,499", image: "/images/jersey (6).jpg" },
    { id: 4, name: "NUSC FAN TEE", price: "₹ 999", discount: "20% OFF", originalPrice: "₹ 1,249", image: "/images/jersey (7).jpg" },
    { id: 5, name: "NUSC PRE-MATCH JACKET", price: "₹ 2,499", image: "/images/jersey (2).jpg" },
    { id: 6, name: "NUSC TRAINING SHORTS", price: "₹ 899", image: "/images/jersey (3).jpg" },
    { id: 7, name: "NUSC TRACKPANTS", price: "₹ 1,599", image: "/images/jersey (4).jpg" },
    { id: 8, name: "NUSC WINDBREAKER", price: "₹ 2,999", image: "/images/jersey (5).jpg" },
  ];

  // Mock search/filtering
  const products = resolvedParams.q === 'empty' ? [] : allProducts;

  return (
    <div className="shop-page">
      <div className="shop-container">
        
        <div className="shop-header">
          <h1 className="shop-title">ALL PRODUCTS</h1>
          <div className="shop-filters">
            <span className="shop-filter-text">Showing {products.length} Products</span>
          </div>
        </div>

        {products.length === 0 ? (
          <div style={{ marginTop: '64px', marginBottom: '64px' }}>
            <EmptyState 
              title="No products found"
              description="We couldn't find any products matching your current filters."
              actionText="Clear Filters"
              onActionClick={() => window.location.href = '/products'}
            />
          </div>
        ) : (
          <div className="pdp-related-grid">
            {products.map(item => (
              <Link href={`/product/${item.id}`} key={item.id} style={{ textDecoration: 'none' }}>
                <div className="pdp-related-card">
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
              </Link>
            ))}
          </div>
        )}

        {products.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '64px', marginBottom: '32px', gap: '8px' }}>
            <button style={{ padding: '8px 16px', background: 'var(--paper)', border: '1px solid var(--line-l)', borderRadius: '4px', cursor: 'not-allowed', color: 'var(--muted)' }} disabled>Previous</button>
            <button style={{ padding: '8px 16px', background: 'var(--navy-900)', color: 'white', border: '1px solid var(--navy-900)', borderRadius: '4px', fontWeight: 600 }}>1</button>
            <button style={{ padding: '8px 16px', background: 'var(--paper)', border: '1px solid var(--line-l)', borderRadius: '4px', cursor: 'pointer' }}>2</button>
            <button style={{ padding: '8px 16px', background: 'var(--paper)', border: '1px solid var(--line-l)', borderRadius: '4px', cursor: 'pointer' }}>3</button>
            <button style={{ padding: '8px 16px', background: 'var(--paper)', border: '1px solid var(--line-l)', borderRadius: '4px', cursor: 'pointer' }}>Next</button>
          </div>
        )}

      </div>
    </div>
  );
}
