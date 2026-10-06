"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, use, useEffect } from "react";
import { ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Ruler, User, X, CheckCircle2, Loader2 } from "lucide-react";
import { getProductById } from "../../actions/product";
import { useCart } from "@/lib/store";

export default function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [showSizeError, setShowSizeError] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [descExpanded, setDescExpanded] = useState(true);
  const [shippingExpanded, setShippingExpanded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const addToCart = useCart((state) => state.addItem);

  useEffect(() => {
    async function loadProduct() {
      const data = await getProductById(resolvedParams.id);
      setProduct(data);
      setLoading(false);
    }
    loadProduct();
  }, [resolvedParams.id]);

  const relatedProducts = [
    { id: 1, name: "NUSC TRAINING T-SHIRT", price: "₹ 1,499", image: "/images/jersey (6).jpg" },
    { id: 2, name: "NUSC FAN TEE", price: "₹ 999", image: "/images/jersey (7).jpg" },
    { id: 3, name: "NUSC GRAPHIC TEE", price: "₹ 1,199", image: "/images/jersey (8).jpg" },
    { id: 4, name: "NUSC AWAY KIT 2026", price: "₹ 1,519", originalPrice: "₹ 1,899", image: "/images/jersey (9).jpg", discount: "-20%" },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loader2 className="lucide-spin" size={48} style={{ color: 'var(--red)' }} />
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px' }}>
        <h2>Product not found</h2>
        <Link href="/" style={{ color: 'var(--red)', textDecoration: 'underline', marginTop: '16px', display: 'inline-block' }}>Return to home</Link>
      </div>
    );
  }

  const allImages = [product.image, ...(product.gallery || [])].filter(Boolean);

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

  const isItemSoldOut = product.sizes.every((s: any) => s.status === 'sold-out');

  return (
    <div className="pdp-container">
      <div className="pdp-top-section">
        {/* Left Column: Images */}
        <div className="pdp-images-column">
          <div className="pdp-main-image-wrap" onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}>
            {product.image ? (
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="(max-width: 980px) 100vw, 50vw"
                style={{ objectFit: 'contain' }}
                priority
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                No Image Available
              </div>
            )}
          </div>
          <div className="pdp-secondary-images">
            {product.gallery.map((img: string, idx: number) => {
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

          <div className="pdp-pricing" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <p className="pdp-price">{product.price}</p>
              {product.originalPrice && (
                <p className="pdp-original-price">
                  <span className="strikethrough">{product.originalPrice}</span>
                  <span className="info-icon">i</span>
                </p>
              )}
            </div>
            {/* Sold Out Badge */}
            {isItemSoldOut && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F1F5F9', color: '#475569', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                Sold Out
              </div>
            )}
          </div>

          {product.sizes.length > 0 && (
            <div className="pdp-sizes">
              <div className="pdp-sizes-header">
                <span className="pdp-sizes-title">CHOOSE SIZE</span>
                <div className="pdp-sizes-links">
                  <button className="pdp-size-guide-btn"><User size={14} /> VIRTUAL FITTING ROOM</button>
                  <button className="pdp-size-guide-btn"><Ruler size={14} /> MEASUREMENTS CHART</button>
                </div>
              </div>
              <div className="pdp-size-grid">
                {product.sizes.map((size: any) => {
                  const isSoldOut = size.status === 'sold-out';
                  const isLimited = !isItemSoldOut && size.status === 'limited';
                  const isSelected = selectedSize === size.label;

                  return (
                    <button
                      key={size.id}
                      className={`pdp-size-btn ${isSoldOut ? 'pdp-size-sold-out' : ''} ${isSelected ? 'pdp-size-selected' : ''}`}
                      onClick={() => {
                        if (!isSoldOut) {
                          setSelectedSize(size.label);
                          setShowSizeError(false);
                        }
                      }}
                      disabled={isSoldOut}
                    >
                      <span className="pdp-size-label">{size.label}</span>
                      {isSoldOut && <span className="pdp-size-status">Sold out</span>}
                      {isLimited && <span className="pdp-size-status limited" style={{ color: 'var(--red)' }}>{size.stock} left</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pdp-actions">
            {showSizeError && (
              <p style={{ color: 'var(--red)', fontSize: '0.9rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                <X size={16} /> Please select a size before adding to cart.
              </p>
            )}
            <button 
              className="pdp-add-to-cart-btn"
              style={{ 
                opacity: isItemSoldOut ? 0.5 : 1, 
                cursor: isItemSoldOut ? 'not-allowed' : 'pointer' 
              }}
              disabled={isItemSoldOut}
              onClick={() => {
                if (product.sizes.length > 0 && !selectedSize) {
                  setShowSizeError(true);
                } else {
                  // Find the selected variant
                  const variant = product.sizes.find((s: any) => s.label === selectedSize) || product.sizes[0];
                  
                  if (variant) {
                    addToCart({
                      id: variant.id,
                      productId: product.id,
                      name: product.name,
                      price: product.rawPrice,
                      image: product.image,
                      size: variant.label,
                      quantity: 1
                    });
                  }

                  // Show add to cart toast
                  setShowToast(true);
                  setTimeout(() => {
                    setShowToast(false);
                  }, 3000);
                }
              }}
            >
              {isItemSoldOut ? 'SOLD OUT' : 'ADD TO CART'}
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
      {lightboxOpen && allImages.length > 0 && (
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

      {/* Toast Notification */}
      {showToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#10B981',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
          zIndex: 9999,
          fontWeight: 500,
          animation: 'slideUp 0.3s ease-out forwards'
        }}>
          <CheckCircle2 size={20} />
          Added {selectedSize ? `(Size: ${selectedSize})` : ''} to your cart
        </div>
      )}
    </div>
  );
}
