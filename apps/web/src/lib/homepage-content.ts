import type { InstagramFeed, InstagramMediaItem } from '@/lib/instagram-feed';

export type HomepageMatch = {
  opponent: string;
  dateTime: string;
  homeAway: 'home' | 'away';
  matchStatus: 'upcoming' | 'in_progress' | 'completed' | 'postponed' | 'cancelled';
  nuscLogoUrl: string | null;
  opponentLogoUrl: string | null;
  venue: string | null;
  competition: string | null;
  scoreResult: string | null;
};

export type HomepageHeroSlide = {
  imageUrl: string;
  alt: string | null;
};

export type HomepageYoutubeHighlight = {
  videoId: string;
  title: string;
  category: string;
};

export type HomepageContent = {
  heroSlides: HomepageHeroSlide[];
  latestMatch: HomepageMatch | null;
  nextMatch: HomepageMatch | null;
  homeFixtures: HomepageMatch[];
  instagramPosts: InstagramMediaItem[];
  instagramReels: InstagramMediaItem[];
  youtubeHighlights: HomepageYoutubeHighlight[];
};

function scheduledHomeFixture(opponent: string, dateTime: string): HomepageMatch {
  return {
    opponent,
    dateTime,
    homeAway: 'home',
    matchStatus: 'upcoming',
    nuscLogoUrl: null,
    opponentLogoUrl: null,
    venue: 'Chümoukedima Football Stadium',
    competition: 'IFL',
    scoreResult: null,
  };
}

const suppliedHomeFixtureSchedule: HomepageMatch[] = [
  scheduledHomeFixture('Dempo SC', '2026-11-30T18:30:00+05:30'),
  scheduledHomeFixture('Chanmari FC', '2026-12-07T18:30:00+05:30'),
  scheduledHomeFixture('Sreenidi Deccan FC', '2026-12-15T18:30:00+05:30'),
  scheduledHomeFixture('Mohammedan SC', '2026-12-19T18:30:00+05:30'),
  scheduledHomeFixture('Rajasthan United FC', '2027-01-04T18:30:00+05:30'),
  scheduledHomeFixture('FC Bengaluru United', '2027-01-09T18:30:00+05:30'),
  scheduledHomeFixture('Shillong Lajong FC', '2027-01-16T18:30:00+05:30'),
  scheduledHomeFixture('Samaleswari SC', '2027-03-13T18:30:00+05:30'),
  scheduledHomeFixture('Real Kashmir FC', '2027-03-20T18:30:00+05:30'),
];

type PayloadRecord = Record<string, unknown>;
type PayloadCollectionResponse = { docs?: unknown[]; hasNextPage?: boolean };

function isRecord(value: unknown): value is PayloadRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getPayloadOrigin() {
  const configuredUrl = process.env.PAYLOAD_URL || process.env.NEXT_PUBLIC_PAYLOAD_URL;
  const fallbackUrl = process.env.NODE_ENV === 'production'
    ? 'https://admin.nagalandunited.com'
    : 'http://localhost:3001';

  try {
    return new URL(configuredUrl || fallbackUrl).origin;
  } catch {
    return fallbackUrl;
  }
}

async function fetchPayloadJson<T>(url: URL): Promise<T | null> {
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

function resolveMediaUrl(value: unknown, origin: string, preferredSize?: 'hero'): string | null {
  if (!isRecord(value)) return null;

  const sizes = isRecord(value.sizes) ? value.sizes : null;
  const preferred = preferredSize && sizes && isRecord(sizes[preferredSize])
    ? sizes[preferredSize]
    : null;
  const candidate = preferred?.url ?? value.url;
  if (typeof candidate !== 'string' || candidate.trim() === '') return null;

  try {
    const url = new URL(candidate, origin);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function resolveInstagramUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    const isInstagramHost = ['instagram.com', 'www.instagram.com'].includes(url.hostname.toLowerCase());
    const isMediaPath = /^\/(p|reel|tv)\/[^/]+\/?$/i.test(url.pathname);

    return url.protocol === 'https:' && isInstagramHost && isMediaPath
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function resolveYouTubeVideoId(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') return null;

    const hostname = url.hostname.toLowerCase();
    const isYouTubeHost = ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(hostname);
    let videoId: string | null = null;

    if (hostname === 'youtu.be') {
      videoId = url.pathname.match(/^\/([^/]+)\/?$/)?.[1] ?? null;
    } else if (isYouTubeHost) {
      if (url.pathname === '/watch') {
        videoId = url.searchParams.get('v');
      } else {
        videoId = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)\/?$/i)?.[1] ?? null;
      }
    }

    return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : null;
  } catch {
    return null;
  }
}

function parseYoutubeHighlights(settings: PayloadRecord | null): HomepageYoutubeHighlight[] {
  if (!settings || !Array.isArray(settings.homePageYoutubeHighlights)) return [];

  return settings.homePageYoutubeHighlights.flatMap((value): HomepageYoutubeHighlight[] => {
    if (!isRecord(value)) return [];

    const videoId = resolveYouTubeVideoId(value.videoUrl);
    const title = typeof value.title === 'string' ? value.title.trim() : '';
    const category = typeof value.category === 'string' ? value.category.trim() : '';
    if (!videoId || !title || !category) return [];

    return [{ videoId, title, category }];
  }).slice(0, 2);
}

function parseInstagramItems(
  settings: PayloadRecord | null,
  fieldName: 'homePageInstagramPosts' | 'homePageInstagramReels',
  origin: string,
): InstagramMediaItem[] {
  if (!settings || !Array.isArray(settings[fieldName])) return [];

  return (settings[fieldName] as unknown[]).flatMap((value, index): InstagramMediaItem[] => {
    if (!isRecord(value) || value.showOnHomepage === false) return [];

    const title = typeof value.title === 'string' ? value.title.trim() : '';
    const image = value.thumbnail;
    const imageUrl = resolveMediaUrl(image, origin);
    const permalink = resolveInstagramUrl(value.instagramUrl);
    const format = fieldName === 'homePageInstagramReels'
      ? 'reel'
      : value.format === 'carousel' ? 'carousel' : 'photo';
    if (!title || !permalink || (format === 'reel' && !imageUrl)) return [];

    const altOverride = typeof value.altText === 'string' ? value.altText.trim() : '';
    const mediaAlt = isRecord(image) && typeof image.alt === 'string' ? image.alt.trim() : '';
    const videoUrl = format === 'reel' ? resolveMediaUrl(value.video, origin) : null;
    return [{
      id: typeof value.id === 'string' && value.id.trim() ? value.id : `${fieldName}-${index}`,
      title,
      alt: altOverride || mediaAlt || title,
      imageUrl,
      videoUrl,
      permalink,
      format,
    }];
  }).slice(0, 5);
}

function parseMatch(value: unknown, origin: string): HomepageMatch | null {
  if (!isRecord(value)) return null;

  const opponent = typeof value.opponent === 'string' ? value.opponent.trim() : '';
  const dateTime = typeof value.dateTime === 'string' ? value.dateTime : '';
  if (!opponent || !dateTime || !Number.isFinite(Date.parse(dateTime))) return null;
  const homeAway = value.homeAway === 'away' ? 'away' : 'home';
  const nuscLogo = homeAway === 'home' ? value.homeTeamLogo : value.awayTeamLogo;
  const opponentLogo = homeAway === 'home' ? value.awayTeamLogo : value.homeTeamLogo;

  return {
    opponent,
    dateTime,
    homeAway,
    matchStatus: parseFixtureStatus(value.matchStatus),
    nuscLogoUrl: resolveMediaUrl(nuscLogo, origin),
    opponentLogoUrl: resolveMediaUrl(opponentLogo, origin),
    venue: typeof value.venue === 'string' && value.venue.trim() ? value.venue.trim() : null,
    competition: typeof value.competition === 'string' && value.competition.trim()
      ? value.competition.trim()
      : null,
    scoreResult: typeof value.scoreResult === 'string' && value.scoreResult.trim()
      ? value.scoreResult.trim()
      : null,
  };
}

function getFixturesUrl(origin: string, status: 'completed' | 'upcoming', sort: string) {
  const url = new URL('/api/fixtures', origin);
  url.searchParams.set('depth', '1');
  url.searchParams.set('limit', '1');
  url.searchParams.set('sort', sort);
  url.searchParams.set('where[matchStatus][equals]', status);

  if (status === 'upcoming') {
    url.searchParams.set('where[dateTime][greater_than_equal]', new Date().toISOString());
  }

  return url;
}

function getHomeFixturesUrl(origin: string, page: number) {
  const url = new URL('/api/fixtures', origin);
  url.searchParams.set('depth', '1');
  url.searchParams.set('limit', '100');
  url.searchParams.set('page', String(page));
  url.searchParams.set('sort', 'dateTime');
  url.searchParams.set('where[homeAway][equals]', 'home');
  return url;
}

type WebsiteSettingsField =
  | 'homePageHeroSlides'
  | 'homePageHeroImage'
  | 'homePageInstagramPosts'
  | 'homePageInstagramReels'
  | 'homePageYoutubeHighlights';

function getWebsiteSettingsUrl(origin: string, fields: readonly WebsiteSettingsField[]) {
  const url = new URL('/api/globals/website-settings', origin);
  url.searchParams.set('depth', '1');

  for (const field of fields) {
    url.searchParams.set(`select[${field}]`, 'true');
  }

  return url;
}

function firstMatch(response: PayloadCollectionResponse | null, origin: string): HomepageMatch | null {
  if (!Array.isArray(response?.docs)) return null;
  return parseMatch(response.docs[0], origin);
}

function parseFixtureStatus(value: unknown): HomepageMatch['matchStatus'] {
  switch (value) {
    case 'in_progress':
    case 'completed':
    case 'postponed':
    case 'cancelled':
      return value;
    default:
      return 'upcoming';
  }
}

async function getHomeFixtures(origin: string): Promise<HomepageMatch[]> {
  const matches: HomepageMatch[] = [];
  let page = 1;

  while (page <= 100) {
    const response = await fetchPayloadJson<PayloadCollectionResponse>(getHomeFixturesUrl(origin, page));
    if (!response || !Array.isArray(response.docs)) return [];

    matches.push(...response.docs.flatMap((value): HomepageMatch[] => {
      const match = parseMatch(value, origin);
      return match?.homeAway === 'home' ? [match] : [];
    }));

    if (response.hasNextPage !== true) break;
    page += 1;
  }

  return matches;
}

function fixtureKey(match: HomepageMatch) {
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).formatToParts(new Date(match.dateTime));
  const year = Number(dateParts.find((part) => part.type === 'year')?.value);
  const month = Number(dateParts.find((part) => part.type === 'month')?.value);
  // Admin reschedules should replace the supplied row within the same July-to-June season.
  const seasonStartYear = month >= 7 ? year : year - 1;
  const opponent = match.opponent.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${seasonStartYear}:${opponent}`;
}

function mergeHomeFixtures(payloadFixtures: HomepageMatch[]) {
  const fixturesByKey = new Map<string, HomepageMatch>();

  for (const fixture of suppliedHomeFixtureSchedule) {
    fixturesByKey.set(fixtureKey(fixture), fixture);
  }

  for (const fixture of payloadFixtures) {
    const key = fixtureKey(fixture);
    const existing = fixturesByKey.get(key);
    fixturesByKey.set(key, existing ? { ...existing, ...fixture } : fixture);
  }

  return Array.from(fixturesByKey.values())
    .map((fixture) => ({
      ...fixture,
      venue: 'Chümoukedima Football Stadium',
      competition: 'IFL',
    }))
    .sort((a, b) => Date.parse(a.dateTime) - Date.parse(b.dateTime));
}

function parseHeroSlides(settings: PayloadRecord | null, origin: string): HomepageHeroSlide[] {
  if (!settings) return [];

  const configuredSlides = Array.isArray(settings.homePageHeroSlides)
    ? settings.homePageHeroSlides.flatMap((value): HomepageHeroSlide[] => {
        if (!isRecord(value)) return [];

        const image = value.image;
        const imageUrl = resolveMediaUrl(image, origin, 'hero');
        if (!imageUrl) return [];

        const altOverride = typeof value.alt === 'string' ? value.alt.trim() : '';
        const mediaAlt = isRecord(image) && typeof image.alt === 'string' ? image.alt.trim() : '';

        return [{ imageUrl, alt: altOverride || mediaAlt || null }];
      })
    : [];

  if (configuredSlides.length > 0) return configuredSlides;

  const legacyImage = settings.homePageHeroImage;
  const legacyUrl = resolveMediaUrl(legacyImage, origin, 'hero');
  if (!legacyUrl) return [];

  const legacyAlt = isRecord(legacyImage) && typeof legacyImage.alt === 'string'
    ? legacyImage.alt.trim()
    : '';

  return [{ imageUrl: legacyUrl, alt: legacyAlt || null }];
}

export async function getHomepageContent(): Promise<HomepageContent> {
  const origin = getPayloadOrigin();

  const [
    heroSettings,
    instagramPostsSettings,
    instagramReelsSettings,
    youtubeSettings,
    completedFixtures,
    upcomingFixtures,
    homeFixtures,
  ] = await Promise.all([
    fetchPayloadJson<PayloadRecord>(
      getWebsiteSettingsUrl(origin, ['homePageHeroSlides', 'homePageHeroImage']),
    ),
    fetchPayloadJson<PayloadRecord>(getWebsiteSettingsUrl(origin, ['homePageInstagramPosts'])),
    fetchPayloadJson<PayloadRecord>(getWebsiteSettingsUrl(origin, ['homePageInstagramReels'])),
    fetchPayloadJson<PayloadRecord>(getWebsiteSettingsUrl(origin, ['homePageYoutubeHighlights'])),
    fetchPayloadJson<PayloadCollectionResponse>(getFixturesUrl(origin, 'completed', '-dateTime')),
    fetchPayloadJson<PayloadCollectionResponse>(getFixturesUrl(origin, 'upcoming', 'dateTime')),
    getHomeFixtures(origin),
  ]);

  return {
    heroSlides: parseHeroSlides(heroSettings, origin),
    latestMatch: firstMatch(completedFixtures, origin),
    nextMatch: firstMatch(upcomingFixtures, origin),
    homeFixtures: mergeHomeFixtures(homeFixtures),
    instagramPosts: parseInstagramItems(instagramPostsSettings, 'homePageInstagramPosts', origin),
    instagramReels: parseInstagramItems(instagramReelsSettings, 'homePageInstagramReels', origin),
    youtubeHighlights: parseYoutubeHighlights(youtubeSettings),
  };
}
