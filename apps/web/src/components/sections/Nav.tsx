"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient as createBrowserClient } from '@nusc/db/src/client/browser';

export function Nav({ theme = 'dark', forceScrolled = false }: { theme?: 'light' | 'dark', forceScrolled?: boolean }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeLink, setActiveLink] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient();
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Drawer overflow toggle
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const main = document.querySelector('main');
      if (main) main.setAttribute('inert', 'true');
      setTimeout(() => {
        const firstLink = document.querySelector('#drawer a') as HTMLElement;
        if (firstLink) firstLink.focus();
      }, 50);
    } else {
      document.body.style.overflow = '';
      const main = document.querySelector('main');
      if (main) main.removeAttribute('inert');
    }
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        setIsOpen(false);
        const burger = document.getElementById('burger');
        if (burger) burger.focus();
        return;
      }

      if (e.key === 'Tab') {
        const burger = document.getElementById('burger');
        const drawer = document.getElementById('drawer');
        if (!drawer || !burger) return;
        const links = Array.from(drawer.querySelectorAll<HTMLElement>('a'));
        if (links.length === 0) return;

        const firstElement = links[0];
        const lastElement = links[links.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            burger.focus();
          } else if (document.activeElement === burger) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            burger.focus();
          } else if (document.activeElement === burger) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handlePopState = () => setIsOpen(false);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    // Nav scrolled state
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    
    // Scrollspy for active link
    const sections = ['home', 'club', 'journey', 'honours'];
    
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveLink(entry.target.id);
          }
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      
      sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });
      
      return () => {
        window.removeEventListener('scroll', onScroll);
        observer.disconnect();
      };
    }
    
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const closeDrawer = () => setIsOpen(false);

  return (
    <>
      <nav className={`nav ${scrolled || forceScrolled ? 'scrolled' : ''} ${theme === 'light' ? 'nav-light' : ''}`} id="nav" aria-label="Primary">
        <div className="wrap nav-in">
          <Link className="brand" href="/" aria-label="Nagaland United Sports Club home" onClick={closeDrawer}>
            <span className="brand-mark" role="img" aria-label="NUSC crest"></span>
            <span className="brand-txt"><b>Nagaland United</b><span>Sports Club</span></span>
          </Link>
          <div className="nav-links" id="navlinks">
            <Link href="/#home" className={activeLink === 'home' ? 'active' : ''}>Home</Link>
            <Link href="/#club" className={activeLink === 'club' ? 'active' : ''}>About</Link>
            <Link href="/#journey" className={activeLink === 'journey' ? 'active' : ''}>Our Journey</Link>
            <Link href="/#honours" className={activeLink === 'honours' ? 'active' : ''}>Honours</Link>
            <Link href="/jersey-interest" className={pathname === '/jersey-interest' ? 'active' : ''}>Jersey</Link>
            <Link href="/registrations" className={pathname === '/registrations' ? 'active' : ''}>Registrations</Link>
          </div>
          
          {isLoggedIn ? (
            <Link href="/dashboard" className="btn btn-red nav-cta">Dashboard</Link>
          ) : (
            <Link href="/membership" className="btn btn-red nav-cta">Membership</Link>
          )}

          <button 
            className={`burger ${isOpen ? 'open' : ''}`}
            id="burger" 
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
            aria-controls="drawer"
            onClick={() => setIsOpen(!isOpen)}
          >
            <span></span>
          </button>
        </div>
      </nav>

      <div className={`drawer ${isOpen ? 'open' : ''}`} id="drawer" role="navigation" aria-label="Mobile">
        <div className="burst faint" aria-hidden="true"></div>
        <Link href="/#home" onClick={closeDrawer}>Home<small>Rise Together</small></Link>
        <Link href="/#club" onClick={closeDrawer}>About<small>About NUSC</small></Link>
        <Link href="/#journey" onClick={closeDrawer}>Our Journey<small>Built on Results. Driven by Progress.</small></Link>
        <Link href="/#honours" onClick={closeDrawer}>Honours<small>Achievements · Earned on the Pitch.</small></Link>
        <Link href="/jersey-interest" onClick={closeDrawer}>Jersey<small>Explore Jerseys</small></Link>
        <Link href="/registrations" onClick={closeDrawer}>Registrations<small>Matchday roles &amp; press accreditation</small></Link>
        {isLoggedIn ? (
          <Link href="/dashboard" onClick={closeDrawer} className="btn btn-red" style={{ marginTop: '1rem' }}>Dashboard</Link>
        ) : (
          <Link href="/membership" onClick={closeDrawer} className="btn btn-red" style={{ marginTop: '1rem' }}>Membership</Link>
        )}
      </div>
    </>
  );
}
