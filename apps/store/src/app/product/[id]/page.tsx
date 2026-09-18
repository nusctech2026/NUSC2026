"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Ruler, User, X } from "lucide-react";

export default function ProductDetailsPage({ params }: { params: { id: string } }) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(true);
  const [shippingExpanded, setShippingExpanded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const product = {
    name: "NUSC 2026 HOME KIT",
    code: "NU26H01",
    price: "₹ 1,899",
    originalPrice: "₹ 2,499",
    image: "/images/jersey (1).jpg",
    gallery: [
      "/images/jersey (2).jpg",
      "/images/jersey (3).jpg",
      "/images/jersey (4).jpg",
      "/images/jersey (5).jpg",
    ],
    description: "The NUSC 2026 Home Kit represents the spirit of Nagaland United Sports Club with a modern touch.\n\nThe bold design features signature red and navy accents, crafted for peak performance on the pitch. Wear your colors with pride...",
    sizes: [
      { label: "XS", status: "available" },
      { label: "S", status: "available" },
      { label: "M", status: "sold-out" },
      { label: "L", status: "available" },
      { label: "XL", status: "available" },
      { label: "XXL", status: "available" },
      { label: "XXXL", status: "limited", message: "2 available" },
    ],
  };

  const relatedProducts = [
    { id: 1, name: "NUSC TRAINING T-SHIRT", price: "₹ 1,499", image: "/images/jersey (6).jpg" },
    { id: 2, name: "NUSC FAN TEE", price: "₹ 999", image: "/images/jersey (7).jpg" },
    { id: 3, name: "NUSC GRAPHIC TEE", price: "₹ 1,199", image: "/images/jersey (8).jpg" },
    { id: 4, name: "NUSC AWAY KIT 2026", price: "₹ 1,519", originalPrice: "₹ 1,899", image: "/images/jersey (9).jpg", discount: "-20%" },
  ];

  const allImages = [product.image, ...(product.gallery || [])];

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      setLightboxIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
    } else if (isRightSwipe) {
      setLightboxIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
    }
  };

  return (
    <div className="pdp-container">
      <div className="pdp-top-section">
        {/* Left Column: Images */}
        <div className="pdp-images-column">
          <div className="pdp-main-image-wrap" onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}>
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 980px) 100vw, 50vw"
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
          <div className="pdp-secondary-images">
            {product.gallery.map((img, idx) => {
              const globalIndex = idx + 1;
              const isLast = idx === product.gallery.length - 1;
              return (
                <div 
                  key={idx} 
                  className={`pdp-sec-img-wrap ${isLast ? 'pdp-sec-img-last' : ''}`}
                  onClick={() => { setLightboxIndex(globalIndex); setLightboxOpen(true); }}
                >
                  <Image src={img} alt={`Gallery image ${idx + 1}`} fill style={{ objectFit: 'contain' }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Info */}
        <div className="pdp-info">
          {/* Breadcrumbs */}
          <div className="pdp-breadcrumbs">
            <Link href="/">Home</Link>
            <ChevronRight size={12} />
            <span>{product.name}</span>
          </div>

          <h1 className="pdp-title">{product.name}</h1>
          <p className="pdp-product-code">Product code: <strong>{product.code}</strong></p>

          <div className="pdp-pricing">
            <p className="pdp-price">{product.price}</p>
            {product.originalPrice && (
              <p className="pdp-original-price">
                <span className="strikethrough">{product.originalPrice}</span>
                <span className="info-icon">i</span>
              </p>
            )}
          </div>

          <div className="pdp-sizes">
            <div className="pdp-sizes-header">
              <span className="pdp-sizes-title">CHOOSE SIZE</span>
              <div className="pdp-sizes-links">
                <button className="pdp-size-guide-btn"><User size={14} /> VIRTUAL FITTING ROOM</button>
                <button className="pdp-size-guide-btn"><Ruler size={14} /> MEASUREMENTS CHART</button>
              </div>
            </div>
            <div className="pdp-size-grid">
              {product.sizes.map(size => {
                const isSoldOut = size.status === 'sold-out';
                const isLimited = size.status === 'limited';
                const isSelected = selectedSize === size.label;

                return (
                  <button
                    key={size.label}
                    className={`pdp-size-btn ${isSoldOut ? 'pdp-size-sold-out' : ''} ${isSelected ? 'pdp-size-selected' : ''}`}
                    onClick={() => !isSoldOut && setSelectedSize(size.label)}
                    disabled={isSoldOut}
                  >
                    <span className="pdp-size-label">{size.label}</span>
                    {isSoldOut && <span className="pdp-size-status">Sold out</span>}
                    {isLimited && <span className="pdp-size-status limited">{size.message}</span>}
                  </button>
                );
              })}
            </div>
            <p className="pdp-out-of-stock-link">
              Out of stock? <a href="#">Get notified</a>
            </p>
          </div>

          <div className="pdp-actions">
            <button className="pdp-add-to-cart-btn">
              ADD TO CART
            </button>
          </div>

          {/* Accordions */}
          <div className="pdp-accordions">
            <div className="pdp-accordion">
              <button
                className="pdp-accordion-header"
                onClick={() => setDescExpanded(!descExpanded)}
              >
                <span>PRODUCT DESCRIPTION</span>
                {descExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {descExpanded && (
                <div className="pdp-accordion-content">
                  <p>{product.description}</p>
                  <button className="pdp-read-more-btn">READ MORE</button>
                </div>
              )}
            </div>

            <div className="pdp-accordion">
              <button
                className="pdp-accordion-header"
                onClick={() => setShippingExpanded(!shippingExpanded)}
              >
                <span>SHIPPING AND RETURNS</span>
                {shippingExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {shippingExpanded && (
                <div className="pdp-accordion-content">
                  <p>Shipping takes 3-5 business days. Free returns within 30 days.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      <div className="pdp-related-section">
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

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="pdp-lightbox">
          <button className="pdp-lightbox-close" onClick={() => setLightboxOpen(false)}>
            <X size={32} strokeWidth={1} />
          </button>
          
          <button 
            className="pdp-lightbox-nav prev"
            onClick={() => setLightboxIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1))}
          >
            <ChevronLeft size={48} strokeWidth={1} />
          </button>
          
          <div 
            className="pdp-lightbox-main"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <Image 
              src={allImages[lightboxIndex]} 
              alt="Product View" 
              fill 
              style={{ objectFit: 'contain', pointerEvents: 'none' }} 
            />
          </div>
          
          <button 
            className="pdp-lightbox-nav next"
            onClick={() => setLightboxIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0))}
          >
            <ChevronRight size={48} strokeWidth={1} />
          </button>
          
          <div className="pdp-lightbox-thumbnails">
            {allImages.map((img, idx) => (
              <button 
                key={idx} 
                className={`pdp-lightbox-thumb ${idx === lightboxIndex ? 'active' : ''}`}
                onClick={() => setLightboxIndex(idx)}
              >
                <Image src={img} alt={`Thumb ${idx}`} fill style={{ objectFit: 'contain' }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
