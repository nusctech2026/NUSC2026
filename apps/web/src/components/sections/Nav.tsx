"use client";

import React, { useState, useEffect } from 'react';
import { createClient as createBrowserClient } from '@nusc/db/src/client/browser';

export function Nav({ theme = 'dark' }: { theme?: 'light' | 'dark' }) {
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
    } else {
      document.body.style.overflow = '';
    }
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    // Nav scrolled state
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    
    // Scrollspy for active link
    const sections = ['club', 'journey', 'honours', 'pathway', 'community', 'partners', 'careers'];
    
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
      <nav className={`nav ${scrolled ? 'scrolled' : ''} ${theme === 'light' ? 'nav-light' : ''}`} id="nav" aria-label="Primary">
        <div className="wrap nav-in">
          <a className="brand" href="#home" aria-label="Nagaland United Sports Club home" onClick={closeDrawer}>
            <span className="brand-mark" role="img" aria-label="NUSC crest"></span>
            <span className="brand-txt"><b>Nagaland United</b><span>Sports Club</span></span>
          </a>
          <div className="nav-links" id="navlinks">
            <a href="/#club" className={activeLink === 'club' ? 'active' : ''}>Club</a>
            <a href="/#journey" className={activeLink === 'journey' ? 'active' : ''}>Journey</a>
            <a href="/#honours" className={activeLink === 'honours' ? 'active' : ''}>Honours</a>
            <a href="/#pathway" className={activeLink === 'pathway' ? 'active' : ''}>Pathway</a>
            <a href="/#community" className={activeLink === 'community' ? 'active' : ''}>Community</a>
            <a href="/#partners" className={activeLink === 'partners' ? 'active' : ''}>Partners</a>
          </div>
          
          {isLoggedIn ? (
            <a href="/dashboard" className="btn btn-red nav-cta">Dashboard</a>
          ) : (
            <a href="/membership" className="btn btn-red nav-cta">Membership</a>
          )}

          <button 
            className={`burger ${isOpen ? 'open' : ''}`}
            id="burger" 
            aria-label="Open menu" 
            aria-expanded={isOpen}
            aria-controls="drawer"
            onClick={() => setIsOpen(!isOpen)}
          >
            <span></span>
          </button>
        </div>
      </nav>

      <div className={`drawer ${isOpen ? 'open' : ''}`} id="drawer">
        <div className="burst faint" aria-hidden="true"></div>
        <a href="/#club" onClick={closeDrawer}>Club<small>Snapshot • Who We Are • Mission</small></a>
        <a href="/#journey" onClick={closeDrawer}>Journey<small>The rise, year by year</small></a>
        <a href="/#honours" onClick={closeDrawer}>Honours<small>Champions • Representing Nagaland</small></a>
        <a href="/#pathway" onClick={closeDrawer}>Pathway<small>Players • Inspire Institute</small></a>
        <a href="/#community" onClick={closeDrawer}>Community<small>Peace Pays</small></a>
        <a href="/#partners" onClick={closeDrawer}>Partners<small>Support NUSC</small></a>
        {isLoggedIn ? (
          <a href="/dashboard" onClick={closeDrawer} className="btn btn-red" style={{ marginTop: '1rem' }}>Dashboard</a>
        ) : (
          <a href="/membership" onClick={closeDrawer} className="btn btn-red" style={{ marginTop: '1rem' }}>Membership</a>
        )}

      </div>
    </>
  );
}
