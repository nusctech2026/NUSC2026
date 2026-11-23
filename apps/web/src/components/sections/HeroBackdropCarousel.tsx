'use client';

import { useEffect, useRef, useState } from 'react';
import type { TouchEvent } from 'react';
import type { HomepageHeroSlide } from '@/lib/homepage-content';

const AUTOPLAY_DELAY_MS = 5000;

export function HeroBackdropCarousel({ slides }: { slides: HomepageHeroSlide[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const slideCount = slides.length;
  const currentIndex = slideCount > 0 ? activeIndex % slideCount : 0;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    if (slideCount < 2 || isHovered || isFocused || prefersReducedMotion) return;

    const timeoutId = window.setTimeout(() => {
      setActiveIndex((index) => (index + 1) % slideCount);
    }, AUTOPLAY_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [currentIndex, isFocused, isHovered, prefersReducedMotion, slideCount]);

  if (slideCount === 0) return null;

  const selectSlide = (index: number) => {
    setActiveIndex((index + slideCount) % slideCount);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch || slideCount < 2) return;

    const horizontalDistance = touch.clientX - start.x;
    const verticalDistance = touch.clientY - start.y;
    if (Math.abs(horizontalDistance) < 48 || Math.abs(horizontalDistance) <= Math.abs(verticalDistance)) return;

    selectSlide(currentIndex + (horizontalDistance < 0 ? 1 : -1));
  };

  return (
    <>
      <div className="home-hero-carousel__slides" role="group" aria-label="Homepage hero images" aria-roledescription="carousel">
        {slides.map((slide, index) => (
          <div
            key={`${slide.imageUrl}-${index}`}
            className={`home-hero__backdrop${index === currentIndex ? ' is-active' : ''}`}
            role={index === currentIndex ? 'img' : undefined}
            aria-label={index === currentIndex ? slide.alt || `Nagaland United football image ${index + 1}` : undefined}
            aria-hidden={index !== currentIndex}
            style={{ backgroundImage: `url(${JSON.stringify(slide.imageUrl)})` }}
          />
        ))}
      </div>

      {slideCount > 1 && (
        <div
          className="home-hero-carousel__gesture-surface"
          aria-hidden="true"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        />
      )}

      {slideCount > 1 && (
        <div
          className="home-hero-carousel__controls"
          role="group"
          aria-label="Hero image controls"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocusCapture={() => setIsFocused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setIsFocused(false);
            }
          }}
        >
          <div className="home-hero-carousel__dots" role="group" aria-label="Choose hero image">
            {slides.map((slide, index) => (
              <button
                key={`${slide.imageUrl}-dot-${index}`}
                type="button"
                className={index === currentIndex ? 'is-active' : ''}
                aria-label={`Show hero image ${index + 1}`}
                aria-current={index === currentIndex ? 'true' : undefined}
                onClick={() => selectSlide(index)}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
