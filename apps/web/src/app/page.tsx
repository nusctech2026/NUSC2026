"use client";

import React, { useEffect } from 'react';
import { Nav } from '@/components/sections/Nav';
import { Hero } from '@/components/sections/Hero';
import { Snapshot } from '@/components/sections/Snapshot';
import { Club } from '@/components/sections/Club';
import { Journey } from '@/components/sections/Journey';
import { Honours } from '@/components/sections/Honours';
import { Pathway } from '@/components/sections/Pathway';
import { Players } from '@/components/sections/Players';
import { Community } from '@/components/sections/Community';
import { Partners } from '@/components/sections/Partners';
import { Vision } from '@/components/sections/Vision';
import { Careers } from '@/components/sections/Careers';
import { Footer } from '@/components/sections/Footer';

export default function Home() {
  useEffect(() => {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      
      document.querySelectorAll('.reveal').forEach((el) => {
        observer.observe(el);
      });
      
      return () => observer.disconnect();
    } else {
      document.querySelectorAll('.reveal').forEach((el) => {
        el.classList.add('in');
      });
    }
  }, []);

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Snapshot />
        <Club />
        <Journey />
        <Honours />
        <Pathway />
        <Players />
        <Community />
        <Vision />
        <Partners />
        <Careers />
      </main>
      <Footer />
    </>
  );
}
