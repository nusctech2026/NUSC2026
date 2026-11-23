import type { HomepageMatch } from '@/lib/homepage-content';
import Image from 'next/image';

const statusLabels: Record<HomepageMatch['matchStatus'], string> = {
  upcoming: 'Upcoming',
  in_progress: 'In progress',
  completed: 'Completed',
  postponed: 'Postponed',
  cancelled: 'Cancelled',
};

function formatFixtureDate(dateTime: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(dateTime));
}

function formatFixtureTime(dateTime: string) {
  return `${new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(dateTime))} IST`;
}

function getFixtureResult(match: HomepageMatch) {
  if (match.matchStatus === 'completed' && match.scoreResult) return match.scoreResult;
  return statusLabels[match.matchStatus];
}

function getTeamInitials(name: string) {
  const words = name.replace(/\b(?:FC|SC)\b/gi, '').trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return (words[0]?.slice(0, 2) ?? '').toUpperCase();
}

function FixtureCrest({ src, initials }: { src: string | null; initials: string }) {
  return (
    <span className={`home-fixtures__crest${src ? '' : ' home-fixtures__crest--fallback'}`} aria-hidden="true">
      {src ? (
        <Image src={src} alt="" width={34} height={34} unoptimized className="home-fixtures__crest-image" />
      ) : initials}
    </span>
  );
}

export function HomepageFixturesTable({ fixtures }: { fixtures: HomepageMatch[] }) {
  return (
    <section className="home-fixtures" aria-labelledby="home-fixtures-title">
      <div className="home-fixtures__inner">
        <header className="home-fixtures__heading">
          <div>
            <p className="home-fixtures__eyebrow">The schedule</p>
            <h2 id="home-fixtures-title">NUSC Home Fixtures</h2>
            <p className="home-fixtures__intro">Upcoming home matches and results, all in one place.</p>
          </div>
          <span className="home-fixtures__count">
            {fixtures.length} fixture{fixtures.length === 1 ? '' : 's'}
          </span>
        </header>

        {fixtures.length > 0 ? (
          <div className="home-fixtures__table-wrap" tabIndex={0} aria-label="All NUSC home fixtures">
            <table className="home-fixtures__table" aria-label="All NUSC home fixtures ordered by date">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Kick-off</th>
                  <th scope="col">Fixture</th>
                  <th scope="col">Competition</th>
                  <th scope="col">Venue</th>
                  <th scope="col">Result / Status</th>
                </tr>
              </thead>
              <tbody>
                {fixtures.map((fixture, index) => (
                  <tr key={`${fixture.dateTime}-${fixture.opponent}-${index}`}>
                    <td data-label="Date">{formatFixtureDate(fixture.dateTime)}</td>
                    <td data-label="Kick-off">{formatFixtureTime(fixture.dateTime)}</td>
                    <td data-label="Fixture" className="home-fixtures__match">
                      <span className="home-fixtures__teams">
                        <span className="home-fixtures__team">
                          <FixtureCrest src={fixture.nuscLogoUrl} initials="NU" />
                          <span className="home-fixtures__team-name">NUSC</span>
                        </span>
                        <span className="home-fixtures__vs">vs</span>
                        <span className="home-fixtures__team">
                          <FixtureCrest src={fixture.opponentLogoUrl} initials={getTeamInitials(fixture.opponent)} />
                          <span className="home-fixtures__team-name">{fixture.opponent}</span>
                        </span>
                      </span>
                    </td>
                    <td data-label="Competition">{fixture.competition || '—'}</td>
                    <td data-label="Venue">{fixture.venue || '—'}</td>
                    <td data-label="Result / Status">
                      <span className={`home-fixtures__status home-fixtures__status--${fixture.matchStatus}`}>
                        {getFixtureResult(fixture)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="home-fixtures__empty">No home fixtures have been published yet.</p>
        )}
      </div>
    </section>
  );
}
