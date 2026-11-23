import { YoutubeHighlightCard } from './YoutubeHighlightCard';
import type { HomepageYoutubeHighlight } from '@/lib/homepage-content';

const youtubeChannelUrl = 'https://www.youtube.com/@NagalandSuperLeague';

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 18" fill="none" aria-hidden="true">
      <path
        d="M23.5 3.2a3 3 0 0 0-2.1-2.1C19.5.6 12 .6 12 .6s-7.5 0-9.4.5A3 3 0 0 0 .5 3.2 31 31 0 0 0 0 9s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 9s0-3.9-.5-5.8Z"
        fill="currentColor"
      />
      <path d="m9.6 12.4 6.2-3.5-6.2-3.5v7Z" fill="#fff" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function YoutubeHighlightsSection({
  highlights,
}: {
  highlights: HomepageYoutubeHighlight[];
}) {
  if (highlights.length === 0) return null;

  return (
    <section className="home-youtube" aria-labelledby="home-youtube-title">
      <div className="home-youtube__inner">
        <div className="home-youtube__intro">
          <div className="home-youtube__brand">
            <YouTubeIcon />
            <h2 id="home-youtube-title">NUSC TV</h2>
          </div>
          <p>Match highlights, club stories and more from Nagaland United.</p>
          <a
            className="home-youtube__channel-link"
            href={youtubeChannelUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Explore more NUSC videos on YouTube"
            title="Explore more videos on YouTube"
          >
            <ArrowIcon />
          </a>
        </div>
        {highlights.map((highlight) => (
          <YoutubeHighlightCard key={highlight.videoId} {...highlight} />
        ))}
      </div>
    </section>
  );
}
