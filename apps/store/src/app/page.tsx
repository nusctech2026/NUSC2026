import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ShopHeroCarousel } from "@/components/shop-hero-carousel";
import { FeaturedCarousel } from "@/components/featured-carousel";
import { emailLink } from "@/content/site";
import { ChevronRight } from "lucide-react";
import { createServerClient } from "@nusc/db";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Frontend preview for the official NUSC store landing page. Products, prices and stock await club approval.",
};

const popularCategories = [
  {
    name: "BEST SELLERS",
    image: "/images/jersey (8).jpg",
  },
  {
    name: "HOODIES",
    image: "/images/jersey (9).jpg",
  },
  {
    name: "T-SHIRTS",
    image: "/images/jersey (10).jpg",
  },
  {
    name: "TRAINING",
    image: "/images/jersey (11).jpg",
  },
];

const discoverCollections = [
  {
    title: "HOME KITS",
    tagline: "THE CLASSIC LOOK",
    image: "/images/jersey (12).jpg",
    wide: true
  },
  {
    title: "AWAY KITS",
    tagline: "BOLD ON THE ROAD",
    image: "/images/jersey (13).jpg",
    wide: false
  },
  {
    title: "TRAINING WEAR",
    tagline: "TRAIN LIKE A PRO",
    image: "/images/jersey (14).jpg",
    wide: false
  },
  {
    title: "GOALKEEPER",
    tagline: "BETWEEN THE STICKS",
    image: "/images/jersey (15).jpg",
    wide: false
  },
  {
    title: "THIRD KITS",
    tagline: "LIMITED EDITION",
    image: "/images/jersey (1).jpg",
    wide: false
  }
];

export default async function ShopPage() {
  const supabase = await createServerClient();
  const { data: dbProducts } = await supabase
    .from('products')
    .select(`
      *,
      product_images (
        storage_path,
        display_order
      ),
      product_variants (
        id,
        sku,
        size,
        color,
        stock_quantity,
        price_override
      )
    `)
    .eq('is_archived', false)
    .eq('is_featured', true)
    .limit(10);

  // Format the db products to match what FeaturedCarousel expects
  const featuredKits = dbProducts ? dbProducts.map(p => {
    // Determine image URL
    // We'll fall back to a placeholder if no images exist
    const images = p.product_images || [];
    images.sort((a: any, b: any) => a.display_order - b.display_order);
    
    let imagePath = "/images/jersey (4).jpg";
    if (images.length > 0 && images[0].storage_path) {
      const sp = images[0].storage_path;
      imagePath = sp.startsWith('/') ? sp : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product_images/${sp}`;
    }
    
    return {
      id: p.id,
      name: p.name,
      price: `₹ ${(p.base_price / 100).toLocaleString('en-IN')}`,
      image: imagePath,
    };
  }) : [];

  return (
    <div className="shop-preview">
      <ShopHeroCarousel />

      <section className="shop-section" id="featured-kits">
        <div className="shop-wrap">
          <div className="category-section-head">
            <h2>FEATURED KITS</h2>
            <div className="category-nav">
              <Link href="#men" className="active">MEN</Link>
              <Link href="#kids">KIDS</Link>
              <Link href="#women">WOMEN</Link>
            </div>
          </div>
          <FeaturedCarousel products={featuredKits} />
        </div>
      </section>

      <section className="promo-banner-section">
        <div className="promo-banner-wrap">
          <div className="promo-banner">
            <div className="promo-content">
              <div className="promo-left">
                <div className="promo-pill">LIMITED TIME OFFER</div>
                <h2 className="promo-headline">
                  PRE-ORDER THE 26/27 KITS &amp; GET<br/>
                  <span className="promo-underline">FREE PERSONALISATION</span>
                </h2>
              </div>
              
              <div className="promo-right">
                <Link href="#shop" className="promo-btn-primary">SHOP NOW <ChevronRight size={16} strokeWidth={2.5}/></Link>
                <Link href="#offers" className="promo-btn-secondary">VIEW ALL OFFERS</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="shop-section" id="popular-categories">
        <div className="shop-wrap">
          <div className="category-section-head">
            <h2>MOST POPULAR CATEGORIES</h2>
            <div className="category-nav">
              <Link href="#men" className="active">MEN</Link>
              <Link href="#kids">KIDS</Link>
              <Link href="#women">WOMEN</Link>
            </div>
          </div>
          <div className="category-grid">
            {popularCategories.map((cat) => (
              <Link href={`#${cat.name.toLowerCase()}`} className="category-card" key={cat.name}>
                <div className="category-image-wrapper">
                  <Image
                    className="category-image"
                    src={cat.image}
                    alt={cat.name}
                    width={400}
                    height={500}
                  />
                  <div className="category-overlay-text">{cat.name}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="shop-section" id="discover-collections">
        <div className="shop-wrap">
          <div className="category-section-head">
            <h2>DISCOVER ALL COLLECTIONS</h2>
          </div>
          <div className="discover-grid">
            {discoverCollections.map((col, idx) => (
              <Link 
                href="#" 
                key={idx} 
                className={`discover-card ${col.wide ? 'wide' : ''}`}
              >
                <Image
                  className="discover-image"
                  src={col.image}
                  alt={col.title}
                  fill
                  style={{ objectFit: 'cover' }}
                />
                <div className="discover-gradient"></div>
                <div className="discover-content">
                  <div className="discover-text">
                    <h3 className="discover-title">{col.title}</h3>
                    <span className="discover-tagline">{col.tagline}</span>
                  </div>
                  <div className="discover-arrow">
                    <ChevronRight size={20} strokeWidth={2.5} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
