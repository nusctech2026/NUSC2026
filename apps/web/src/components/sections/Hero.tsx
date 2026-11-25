import { HomepageMatchCards } from './HomepageMatchCards';
import { HeroBackdropCarousel } from './HeroBackdropCarousel';
import type { HomepageHeroSlide, HomepageMatch } from '@/lib/homepage-content';

export function Hero({ heroSlides, latestMatch, nextMatch }: {
  heroSlides: HomepageHeroSlide[];
  latestMatch: HomepageMatch | null;
  nextMatch: HomepageMatch | null;
}) {
  return (
    <div className="home-hero-stage">
      <header className="hero home-hero" id="home">
        <HeroBackdropCarousel slides={heroSlides} />
        <div className="home-hero__shade" aria-hidden="true" />
        <div className="burst" aria-hidden="true" />
        <div className="hero-grid" aria-hidden="true" />
        <span className="hero-crest" role="img" aria-label="NUSC crest watermark" />
        <div className="wrap hero-in">
          <div className="eyebrow on-dark hero-club">Nagaland United Sports Club</div>
          <h1><span className="rise">Rise</span><span className="tog">Together.</span></h1>
          <p className="hero-sub">
            <span className="hero-sub-desktop">
              Nagaland United Sports Club competes in the Indian Football League (IFL), taking Nagaland’s football ambitions to the national stage.
            </span>
            <span className="hero-sub-mobile">Competing in the IFL. Building Nagaland&apos;s football future.</span>
          </p>
          <div className="hero-actions" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <a
              className="btn btn-red btn-lg hero-cta-desktop"
              href="https://www.youtube.com/@NagalandUnitedSportsClub"
              target="_blank"
              rel="noopener noreferrer"
            >
              NUSC YT <span className="ar" aria-hidden="true">↗</span>
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
      <HomepageMatchCards latestMatch={latestMatch} nextMatch={nextMatch} />
    </div>
  );
}
