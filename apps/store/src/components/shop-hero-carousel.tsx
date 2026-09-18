"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const slides = [
  {
    title: "Now is the time",
    copy: "Rep the crest. Claim your colours. The first NUSC store preview is taking shape.",
    image: "/images/jersey (1).jpg",
    alt: "Synthetic supporter holding a white, navy and red football shirt",
    cta: "Shop the Range",
    href: "#featured-kits",
  },
  {
    title: "Away colors",
    copy: "Built for matchdays on the road, supporter nights and the next collection drop.",
    image: "/images/jersey (2).jpg",
    alt: "Synthetic player wearing a navy, red and white away shirt",
    cta: "Browse Kits",
    href: "#categories-title",
  },
  {
    title: "Training ready",
    copy: "Training wear, supporter pieces and launch details are being prepared for club review.",
    image: "/images/jersey (3).jpg",
    alt: "Synthetic player wearing red and navy football training wear",
    cta: "View Status",
    href: "#shop-status",
  },
];

export function ShopHeroCarousel() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  useEffect(() => {
    if (isPaused) return;
    const interval = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(interval);
  }, [isPaused]);

  const selectSlide = (index: number) => setActiveSlide(index);
  const previousSlide = () =>
    setActiveSlide((current) => (current - 1 + slides.length) % slides.length);
  const nextSlide = () =>
    setActiveSlide((current) => (current + 1) % slides.length);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    
    if (distance > 50) {
      nextSlide();
    } else if (distance < -50) {
      previousSlide();
    }
    
    setTouchStart(0);
    setTouchEnd(0);
  };

  return (
    <section
      className="shop-hero-carousel"
      aria-roledescription="carousel"
      aria-label="Shop hero"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="shop-hero-slides">
        {slides.map((slide, index) => (
          <div
            className={`shop-hero-slide ${index === activeSlide ? "active" : ""}`}
            aria-hidden={index !== activeSlide}
            key={slide.title}
          >
            <Image
              src={slide.image}
              alt={slide.alt}
              fill
              priority={index === 0}
              sizes="100vw"
              style={{ objectFit: 'cover' }}
            />
            {/* Scrim for text legibility without a heavy gradient */}
            <div className="hero-scrim"></div>
          </div>
        ))}
      </div>

      <div className="shop-hero-content-center">
        <h1 id="shop-title">OWN THE GLORY</h1>
        <p>From today&apos;s pitch to legendary moments. 100% authentic gear for<br/>the ultimate fan. Complete your history</p>
        <Link className="btn btn-red" href="#collections">
          View Collections
        </Link>
      </div>

      <div className="shop-carousel-indicators" aria-label="Select shop hero slide">
        {slides.map((slide, index) => (
          <button
            className={index === activeSlide ? "active" : ""}
            type="button"
            aria-label={`Show slide ${index + 1}`}
            aria-current={index === activeSlide}
            onClick={() => selectSlide(index)}
            key={slide.title}
          />
        ))}
      </div>
    </section>
  );
}
