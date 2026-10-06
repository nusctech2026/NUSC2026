"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Filter, Search as SearchIcon, X } from "lucide-react";
import "./search.css";
import { useSearchParams } from "next/navigation";

import { EmptyState } from "@/components/empty-state";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "jerseys";
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const allProducts = [
    { id: 1, name: "NUSC 2026 HOME KIT", price: "₹ 1,899", image: "/images/jersey (4).jpg", category: "jerseys" },
    { id: 2, name: "NUSC 2026 AWAY KIT", price: "₹ 1,899", image: "/images/jersey (5).jpg", category: "jerseys" },
    { id: 3, name: "NUSC PRE-MATCH JACKET", price: "₹ 2,499", image: "/images/jersey (2).jpg", category: "jackets" },
    { id: 4, name: "NUSC WINDBREAKER", price: "₹ 2,999", image: "/images/jersey (5).jpg", category: "jackets" },
    { id: 5, name: "NUSC TRAINING SHORTS", price: "₹ 899", image: "/images/jersey (3).jpg", category: "shorts" },
    { id: 6, name: "NUSC FAN TEE", price: "₹ 999", image: "/images/jersey (7).jpg", category: "tshirts" },
  ];

  const products = allProducts.filter(p => 
    p.category.includes(query.toLowerCase()) || 
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div style={{ padding: '64px 20px', minHeight: '100vh', background: 'var(--white)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Search Header */}
        <div style={{ marginBottom: '40px', borderBottom: '1px solid var(--line-l)', paddingBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
             <SearchIcon size={28} color="var(--muted)" />
             <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', margin: 0, fontWeight: 800, color: 'var(--navy-900)' }}>
               Search Results for "{query}"
             </h1>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '1.1rem' }}>
            Showing {products.length} matching products
          </p>
        </div>

        <div className="search-layout">
          {/* Mobile Sticky Bottom Action Bar */}
          <div className="search-mobile-action-bar">
            <button className="search-mobile-action-btn" onClick={() => setIsSortOpen(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>
              Sort
            </button>
            <button className="search-mobile-action-btn" onClick={() => setIsFilterOpen(true)}>
              <Filter size={18} />
              Filter
            </button>
          </div>

          {/* Filters Sidebar */}
          <div className="search-filters-sidebar" style={{ position: 'sticky', top: '100px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--line-l)', paddingBottom: '16px' }}>
              <Filter size={20} />
              <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>Filters</h2>
            </div>
            
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Categories</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {['All Categories', 'Jerseys', 'Shorts', 'Jackets', 'Accessories'].map((cat, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked={i === 0 || cat.toLowerCase() === query.toLowerCase()} style={{ width: '16px', height: '16px', accentColor: 'var(--red)' }} />
                    <span style={{ color: 'var(--ink)' }}>{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Size</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['S', 'M', 'L', 'XL', 'XXL'].map((size, i) => (
                  <button key={i} style={{ width: '40px', height: '40px', border: '1px solid var(--line-l)', background: 'var(--white)', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', color: 'var(--ink)' }}>
                    {size}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Price</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {['Under ₹1,000', '₹1,000 - ₹2,000', 'Over ₹2,000'].map((price, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input type="checkbox" style={{ width: '16px', height: '16px', accentColor: 'var(--red)' }} />
                    <span style={{ color: 'var(--ink)' }}>{price}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Product Grid */}
          {products.length > 0 ? (
            <div className="pdp-related-grid">
              {products.map(item => {
                const isSoldOut = item.id === 2 || item.id === 5; // Mock sold out for some items
                return (
                  <Link href={`/product/${isSoldOut ? 'sold-out' : item.id}`} key={item.id} style={{ textDecoration: 'none' }}>
                    <div className="pdp-related-card" style={{ opacity: isSoldOut ? 0.6 : 1 }}>
                      <div className="pdp-related-img-wrap" style={{ position: 'relative' }}>
                        <Image src={item.image} alt={item.name} fill style={{ objectFit: 'contain' }} />
                        {isSoldOut && (
                          <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'var(--navy-950)', color: 'white', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 700, borderRadius: '4px', textTransform: 'uppercase' }}>
                            Sold Out
                          </div>
                        )}
                      </div>
                      <h3 className="pdp-related-name">{item.name}</h3>
                      <div className="pdp-related-price-wrap">
                        <span className="pdp-related-price">{item.price}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div style={{ marginTop: '24px' }}>
              <EmptyState 
                icon={<SearchIcon size={48} color="var(--line-l)" />}
                title="No results found"
                description={`We couldn't find any products matching "${query}". Try checking your spelling or using different keywords.`}
                actionText="Clear Search"
                actionHref="/search"
              />
            </div>
          )}
          
          {products.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '48px', marginBottom: '16px', gap: '8px' }}>
              <button style={{ padding: '8px 16px', background: 'var(--paper)', border: '1px solid var(--line-l)', borderRadius: '4px', cursor: 'not-allowed', color: 'var(--muted)' }} disabled>Previous</button>
              <button style={{ padding: '8px 16px', background: 'var(--navy-900)', color: 'white', border: '1px solid var(--navy-900)', borderRadius: '4px', fontWeight: 600 }}>1</button>
              <button style={{ padding: '8px 16px', background: 'var(--paper)', border: '1px solid var(--line-l)', borderRadius: '4px', cursor: 'pointer' }}>2</button>
              <button style={{ padding: '8px 16px', background: 'var(--paper)', border: '1px solid var(--line-l)', borderRadius: '4px', cursor: 'pointer' }}>Next</button>
            </div>
          )}
        </div>

      </div>

      {/* Mobile Sort Modal */}
      {isSortOpen && (
        <div className="search-mobile-modal-overlay" onClick={() => setIsSortOpen(false)}>
          <div className="search-mobile-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>Sort By</h2>
              <button onClick={() => setIsSortOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {['Recommended', 'Newest Arrivals', 'Price: Low to High', 'Price: High to Low'].map((opt, i) => (
                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', paddingBottom: '16px', borderBottom: i !== 3 ? '1px solid var(--line-l)' : 'none' }}>
                  <input type="radio" name="sort" defaultChecked={i === 0} style={{ width: '18px', height: '18px', accentColor: 'var(--red)' }} />
                  <span style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>{opt}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Filter Modal */}
      {isFilterOpen && (
        <div className="search-mobile-modal-overlay" onClick={() => setIsFilterOpen(false)}>
          <div className="search-mobile-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>Filters</h2>
              <button onClick={() => setIsFilterOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            {/* Same filter content as sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '16px' }}>Categories</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {['All Categories', 'Jerseys', 'Shorts', 'Jackets', 'Accessories'].map((cat, i) => (
                    <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                      <input type="checkbox" defaultChecked={i === 0 || cat.toLowerCase() === query.toLowerCase()} style={{ width: '18px', height: '18px', accentColor: 'var(--red)' }} />
                      <span style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '16px' }}>Size</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {['S', 'M', 'L', 'XL', 'XXL'].map((size, i) => (
                    <button key={i} style={{ width: '44px', height: '44px', border: '1px solid var(--line-l)', background: 'var(--white)', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', color: 'var(--ink)' }}>
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '16px' }}>Price</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {['Under ₹1,000', '₹1,000 - ₹2,000', 'Over ₹2,000'].map((price, i) => (
                    <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                      <input type="checkbox" style={{ width: '18px', height: '18px', accentColor: 'var(--red)' }} />
                      <span style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>{price}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Apply Button */}
            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--line-l)' }}>
               <button onClick={() => setIsFilterOpen(false)} style={{ width: '100%', padding: '16px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer' }}>
                 Apply Filters
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
