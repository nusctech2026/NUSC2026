"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { Star, Shield, Plus, Heart } from "lucide-react";
import { useRouter } from "next/navigation";

export function FeaturedCarousel({ products }: { products: { id: string, name: string, image: string, price: string | number }[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);
  const router = useRouter();

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeft(scrollLeft > 0);
      setShowRight(Math.ceil(scrollLeft) < scrollWidth - clientWidth);
    }
  };

  useEffect(() => {
    handleScroll(); // Initial check
    window.addEventListener("resize", handleScroll);
    return () => window.removeEventListener("resize", handleScroll);
  }, []);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  return (
    <div className={`carousel-container ${!showLeft ? "is-start" : ""}`}>
      <button 
        className={`carousel-btn left ${showLeft ? "visible" : "hidden"}`} 
        onClick={scrollLeft} 
        aria-label="Scroll left"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <div className="featured-grid" ref={scrollRef} onScroll={handleScroll}>
        {products.map((product, index) => (
          <article className="featured-card" key={`${product.id}-${index}`}>
            <div className="fc-image-wrap">
              <div className={`fc-badge ${index % 2 === 0 ? 'authentic' : 'exclusive'}`}>
                {index % 2 === 0 ? (
                  <><Star size={12} strokeWidth={2.5} /> Authentic Edition</>
                ) : (
                  <><Shield size={12} strokeWidth={2.5} /> NUSC Exclusive</>
                )}
              </div>
              <Link href={`/product/${product.id}`} style={{ display: 'block', width: '100%', height: '100%' }}>
                <Image
                  className="fc-photo"
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(max-width: 980px) 100vw, 33vw"
                  style={{ objectFit: 'cover' }}
                />
              </Link>
              <button className="fc-quick-add" onClick={() => router.push(`/product/${product.id}`)}>
                VIEW DETAILS <Plus size={16} strokeWidth={2} />
              </button>
            </div>
            <div className="fc-info-wrap">
              <div className="fc-info-text">
                <p className="fc-subtitle">
                  {index % 2 === 0 ? "PRO MATCH COLLECTION" : "SUPPORTER COLLECTION"}
                </p>
                <Link href={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <h3 className="fc-title">{product.name}</h3>
                </Link>
                <div className="fc-price">{product.price}</div>
              </div>
              <button className="fc-wishlist-btn" aria-label="Save to wishlist">
                <Heart size={16} strokeWidth={1.5} />
              </button>
            </div>
          </article>
        ))}
      </div>
      <button 
        className={`carousel-btn right ${showRight ? "visible" : "hidden"}`} 
        onClick={scrollRight} 
        aria-label="Scroll right"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  );
}
