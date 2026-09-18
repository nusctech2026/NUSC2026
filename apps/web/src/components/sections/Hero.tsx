"use client";

import React from 'react';

const MARQUEE_ITEMS = [
  "NSF Martyrs Memorial Trophy — Champions 2025",
  "3rd — Inaugural Nagaland Super League",
  "4 Players — Inspire Institute of Sport",
  "Dr T. Ao Trophy — Mon District Champions",
  "Players signed to Calicut FC & Mawlai SC",
  "Santosh Trophy — Nagaland Selection"
];

export function Hero() {
  return (
    <>
      <header className="hero" id="home">
        <div className="burst" aria-hidden="true"></div>
        <div className="hero-grid" aria-hidden="true"></div>
        <span className="hero-crest" role="img" aria-label="NUSC crest watermark"></span>
        <div className="wrap hero-in">
          <div className="eyebrow on-dark hero-club">Nagaland United Sports Club</div>
          <h1><span className="rise">Rise</span><span className="tog">Together.</span></h1>
          <div className="hero-beat">Born in 2024. <b>Champions in 2025.</b> Just getting started.</div>
          <p className="hero-sub">A community football club from Nagaland, competing hard and building players for the next level.</p>
          <div className="hero-actions">
            <a className="btn btn-red btn-lg" href="#journey">Our Journey <span className="ar">↓</span></a>
          </div>
        </div>
        <div className="scroll-cue" aria-hidden="true"><span className="mouse"></span>Scroll</div>
      </header>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track" id="mq" style={{ animationDuration: '170s' }}>
          {[...Array(10)].map((_, groupIndex) => (
            <React.Fragment key={groupIndex}>
              {MARQUEE_ITEMS.map((item, index) => (
                <span className="item" key={`${groupIndex}-${index}`}>
                  <span className="dot"></span>{item}
                </span>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </>
  );
}
