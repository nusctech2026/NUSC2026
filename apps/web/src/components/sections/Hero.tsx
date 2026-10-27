export function Hero() {
  return (
    <header className="hero" id="home">
      <div className="burst" aria-hidden="true" />
      <div className="hero-grid" aria-hidden="true" />
      <span className="hero-crest" role="img" aria-label="NUSC crest watermark" />
      <div className="wrap hero-in">
        <div className="eyebrow on-dark hero-club">Nagaland United Sports Club</div>
        <h1><span className="rise">Rise</span><span className="tog">Together.</span></h1>
        <p className="hero-sub">
          Nagaland United Sports Club competes in the Indian Football League (IFL),
          taking Nagaland’s football ambitions to the national stage.
        </p>
        <div className="hero-actions" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <a className="btn btn-red btn-lg hero-cta-desktop" href="/#journey">
            Explore Our Journey
            <svg className="hero-cta-arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 4v15m-6-6 6 6 6-6" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <a className="btn btn-red btn-lg hero-cta-mobile" href="/membership">
            Membership
          </a>
          <a
            className="btn btn-ghost btn-lg"
            href="https://instagram.com/nagalandunited"
            target="_blank"
            rel="noopener noreferrer"
          >
            Follow NUSC <span className="ar" aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
      <div className="scroll-cue" aria-hidden="true"><span className="mouse" />Scroll</div>
    </header>
  );
}
