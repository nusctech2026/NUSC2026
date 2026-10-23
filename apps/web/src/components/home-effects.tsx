"use client";

import { useEffect } from 'react';

// Keep browser effects outside the homepage's static section tree.
export function HomeEffects() {
  useEffect(() => {
    const redirects: Record<string, string> = {
      careers: '/careers',
    };
    const migrateHash = () => {
      const destination = redirects[window.location.hash.substring(1)];
      if (destination) window.location.replace(destination);
    };
    migrateHash();
    window.addEventListener('hashchange', migrateHash);

    const nodes = document.querySelectorAll('.reveal');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const showAll = () => nodes.forEach(node => node.classList.add('in'));
    if (!('IntersectionObserver' in window) || motion.matches) {
      showAll();
      return () => window.removeEventListener('hashchange', migrateHash);
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    nodes.forEach(node => observer.observe(node));
    const onMotion = () => {
      if (motion.matches) { showAll(); observer.disconnect(); }
    };
    motion.addEventListener('change', onMotion);
    return () => {
      observer.disconnect();
      motion.removeEventListener('change', onMotion);
      window.removeEventListener('hashchange', migrateHash);
    };
  }, []);
  return null;
}
