import type { HomepageMatch } from '@/lib/homepage-content';

type HomepageMatchCardsProps = {
  latestMatch: HomepageMatch | null;
  nextMatch: HomepageMatch | null;
};

function formatMatchDate(dateTime: string) {
  const date = new Date(dateTime);
  if (!Number.isFinite(date.getTime())) return 'Date to be announced';

  const day = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date);
  const time = new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(date);

  return `${day} · ${time} IST`;
}

function formatFixtureDate(dateTime: string) {
  const date = new Date(dateTime);
  if (!Number.isFinite(date.getTime())) return 'Date to be announced';

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

function formatFixtureTime(dateTime: string) {
  const date = new Date(dateTime);
  if (!Number.isFinite(date.getTime())) return 'Time to be announced';

  return `${new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(date)} IST`;
}

function formatResult(match: HomepageMatch) {
  const score = match.scoreResult?.match(/(\d{1,2})\s*[-–:]\s*(\d{1,2})/);
  if (!score) return match.scoreResult || '—';

  return `${score[1]} – ${score[2]}`;
}

function getOpponentInitials(opponent: string) {
  return opponent
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function ClubBadge({ logoUrl, fallback, isNusc = false }: { logoUrl: string | null; fallback: string; isNusc?: boolean }) {
  const badgeClass = logoUrl
    ? 'home-match-card__badge home-match-card__badge--logo'
    : `home-match-card__badge${isNusc ? ' home-match-card__badge--nusc' : ''}`;

  return (
    <span className={badgeClass} aria-hidden="true">
      {logoUrl ? <img src={logoUrl} alt="" width={64} height={64} loading="lazy" decoding="async" /> : fallback}
    </span>
  );
}

function getMatchTeams(match: HomepageMatch) {
  const nusc = { name: 'NUSC', logoUrl: match.nuscLogoUrl, fallback: 'NU', isNusc: true };
  const opponent = {
    name: match.opponent,
    logoUrl: match.opponentLogoUrl,
    fallback: getOpponentInitials(match.opponent),
    isNusc: false,
  };

  return match.homeAway === 'home'
    ? { homeTeam: nusc, awayTeam: opponent }
    : { homeTeam: opponent, awayTeam: nusc };
}

function Matchup({ match }: { match: HomepageMatch }) {
  const { homeTeam, awayTeam } = getMatchTeams(match);

  return (
    <div className="home-match-card__matchup home-match-card__matchup--fixture" role="group" aria-label={`${homeTeam.name} versus ${awayTeam.name}`}>
      <div className="home-match-card__fixture-logo">
        <ClubBadge logoUrl={homeTeam.logoUrl} fallback={homeTeam.fallback} isNusc={homeTeam.isNusc} />
      </div>
      <div className="home-match-card__fixture-names">
        <span>{homeTeam.name}</span>
        <span className="home-match-card__versus" aria-hidden="true">vs</span>
        <span>{awayTeam.name}</span>
      </div>
      <div className="home-match-card__fixture-logo">
        <ClubBadge logoUrl={awayTeam.logoUrl} fallback={awayTeam.fallback} isNusc={awayTeam.isNusc} />
      </div>
    </div>
  );
}

function MatchResult({ match }: { match: HomepageMatch }) {
  const { homeTeam, awayTeam } = getMatchTeams(match);
  const score = formatResult(match);

  return (
    <>
      <div className="home-match-card__result-row">
        <div className="home-match-card__team">
          <ClubBadge logoUrl={homeTeam.logoUrl} fallback={homeTeam.fallback} isNusc={homeTeam.isNusc} />
          <span>{homeTeam.name}</span>
        </div>
        <strong className="home-match-card__score" aria-label={`${homeTeam.name} ${score} ${awayTeam.name}`}>
          {score}
        </strong>
        <div className="home-match-card__team">
          <ClubBadge logoUrl={awayTeam.logoUrl} fallback={awayTeam.fallback} isNusc={awayTeam.isNusc} />
          <span>{awayTeam.name}</span>
        </div>
      </div>
      <p className="home-match-card__footnote">
        {formatMatchDate(match.dateTime)}{match.venue ? ` · ${match.venue}` : ''}
      </p>
    </>
  );
}

function FixtureDetailIcon({ kind }: { kind: 'date' | 'time' | 'venue' | 'home-away' }) {
  const paths = {
    date: <><rect x="3" y="4.5" width="14" height="13" rx="2" /><path d="M6.5 2.5v4M13.5 2.5v4M3 8h14" /></>,
    time: <><circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.7 1.7" /></>,
    venue: <><path d="M16.5 8.5c0 4.2-6.5 9-6.5 9s-6.5-4.8-6.5-9a6.5 6.5 0 1 1 13 0Z" /><circle cx="10" cy="8.5" r="2" /></>,
    'home-away': <><path d="m3 9 7-6 7 6v8H5V9" /><path d="M8 17v-5h4v5" /></>,
  };

  return (
    <svg className="home-match-card__detail-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      {paths[kind]}
    </svg>
  );
}

export function HomepageMatchCards({ latestMatch, nextMatch }: HomepageMatchCardsProps) {
  return (
    <section className="home-match-ribbon wrap" aria-label="Latest result and next NUSC match">
      <article className="home-match-card home-match-card--result" aria-labelledby="home-latest-match-title">
        <div className="home-match-card__content">
          <div className="home-match-card__heading">
            <h2 id="home-latest-match-title">Latest Match <span>| {latestMatch?.competition || 'Result'}</span></h2>
            <span className="home-match-card__tag">{latestMatch ? 'Full Time' : 'Awaiting Result'}</span>
          </div>
          {latestMatch ? (
            <MatchResult match={latestMatch} />
          ) : (
            <p className="home-match-card__empty">No completed result has been published yet.</p>
          )}
        </div>
      </article>

      <article className="home-match-card home-match-card--next" aria-labelledby="home-next-match-title">
        <div className="home-match-card__content">
          <div className="home-match-card__heading">
            <h2 id="home-next-match-title">Next Match <span>| {nextMatch?.competition || 'Fixture'}</span></h2>
            <span className="home-match-card__tag">Upcoming</span>
          </div>
          {nextMatch ? (
            <div className="home-match-card__next-layout">
              <Matchup match={nextMatch} />
              <div className="home-match-card__next-details" role="group" aria-label="Fixture details">
                <p className="home-match-card__next-detail">
                  <FixtureDetailIcon kind="date" />
                  <span><span>Date</span><strong>{formatFixtureDate(nextMatch.dateTime)}</strong></span>
                </p>
                <p className="home-match-card__next-detail">
                  <FixtureDetailIcon kind="time" />
                  <span><span>Kick-off</span><strong>{formatFixtureTime(nextMatch.dateTime)}</strong></span>
                </p>
                {nextMatch.venue && (
                  <p className="home-match-card__next-detail">
                    <FixtureDetailIcon kind="venue" />
                    <span><span>Venue</span><strong>{nextMatch.venue}</strong></span>
                  </p>
                )}
                <p className="home-match-card__next-detail">
                  <FixtureDetailIcon kind="home-away" />
                  <span><span>Home / Away</span><strong>{nextMatch.homeAway === 'home' ? 'Home' : 'Away'}</strong></span>
                </p>
              </div>
            </div>
          ) : (
            <p className="home-match-card__empty">The next fixture will be announced soon.</p>
          )}
        </div>
      </article>
    </section>
  );
}
