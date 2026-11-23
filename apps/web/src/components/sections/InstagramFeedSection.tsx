import { club } from '@/content/site';
import type { InstagramMediaFormat, InstagramMediaItem } from '@/lib/instagram-feed';
import { AutoplayReelVideo } from './AutoplayReelVideo';
import { InstagramEmbedScript, InstagramPostEmbed } from './InstagramPostEmbed';

const formatLabels: Record<InstagramMediaFormat, string> = {
  photo: 'Photo',
  carousel: 'Carousel',
  reel: 'Reel',
};

function InstagramGlyph() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2.5" y="2.5" width="15" height="15" rx="4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="10" cy="10" r="3.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="14.7" cy="5.4" r="1" fill="currentColor" />
    </svg>
  );
}

function MediaFormatIcon({ format }: { format: InstagramMediaFormat }) {
  if (format === 'reel') {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M7 4.8v10.4L15 10 7 4.8Z" fill="currentColor" />
      </svg>
    );
  }

  if (format === 'carousel') {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="6" y="3" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 6v10a1 1 0 0 0 1 1h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2.5" y="3.5" width="15" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="m4.5 14 3-3 2 2 2.5-3 3.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M6 14 14 6M6.5 6H14v7.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SectionHeading() {
  return (
    <header className="home-instagram__header">
      <div className="home-instagram__intro">
        <p className="home-instagram__eyebrow">Follow the club</p>
        <h2 id="home-instagram-title">NUSC on Instagram</h2>
        <p className="home-instagram__subtitle">
          Matchdays, training and life around the club.
        </p>
      </div>
      <a
        className="home-instagram__profile"
        href={club.instagram}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Visit Nagaland United Sports Club on Instagram"
      >
        <InstagramGlyph />
        <span>Follow @nagalandunited</span>
        <ExternalLinkIcon />
      </a>
    </header>
  );
}

function newestPostFirst(posts: InstagramMediaItem[]) {
  if (posts.length < 2) return posts;

  return [posts[posts.length - 1], ...posts.slice(0, -1)];
}

function InstagramCard({ item }: { item: InstagramMediaItem }) {
  const title = item.title || `View the latest NUSC ${formatLabels[item.format].toLowerCase()}`;
  const actionLabel = item.format === 'reel' ? 'Watch Reel' : 'View on Instagram';
  const isReel = item.format === 'reel';
  const isEmbeddedPost = !isReel && !item.imageUrl;

  return (
    <article
      className={`home-instagram__card home-instagram__card--${item.format}${isEmbeddedPost ? ' home-instagram__card--embed' : ''}`}
    >
      <div className={`home-instagram__media${isEmbeddedPost ? ' home-instagram__media--embed' : ''}`}>
        {isEmbeddedPost ? (
          <InstagramPostEmbed permalink={item.permalink} title={title} />
        ) : isReel && item.videoUrl && item.imageUrl ? (
          <AutoplayReelVideo src={item.videoUrl} poster={item.imageUrl} title={title} />
        ) : item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.alt || title}
            width={480}
            height={600}
            loading="lazy"
            decoding="async"
          />
        ) : null}
        {!isEmbeddedPost ? (
          <span
            className={`home-instagram__format home-instagram__format--${item.format}`}
            aria-hidden="true"
            title={formatLabels[item.format]}
          >
            <MediaFormatIcon format={item.format} />
          </span>
        ) : null}
      </div>
      {isReel && !item.videoUrl ? (
        <a
          className="home-instagram__card-link"
          href={item.permalink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${actionLabel} on Instagram: ${title}`}
        />
      ) : !isReel ? (
        <a
          className="home-instagram__card-link"
          href={item.permalink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${actionLabel}: ${title}`}
        />
      ) : null}
      <span className={`home-instagram__card-body${isReel ? ' home-instagram__card-body--reel' : ''}${isEmbeddedPost ? ' home-instagram__card-body--embed' : ''}`} aria-hidden={!isReel && !isEmbeddedPost}>
        <span className="home-instagram__caption">{title}</span>
        {isReel || isEmbeddedPost ? (
          <a
            className="home-instagram__card-action home-instagram__card-action--link"
            href={item.permalink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${actionLabel}: ${title}`}
          >
            {actionLabel}
            <ExternalLinkIcon />
          </a>
        ) : (
          <span className="home-instagram__card-action">
            {actionLabel}
            <ExternalLinkIcon />
          </span>
        )}
      </span>
    </article>
  );
}

function InstagramMediaGrid({ items, label }: { items: InstagramMediaItem[]; label: string }) {
  return (
    <div className="home-instagram__group">
      <h4 className="home-instagram__group-title">{label}</h4>
      <div className="home-instagram__grid" data-count={items.length}>
        {items.map((item) => (
          <InstagramCard key={`${item.format}-${item.id}`} item={item} />
        ))}
      </div>
    </div>
  );
}

function FeedGrid({ posts, reels }: { posts: InstagramMediaItem[]; reels: InstagramMediaItem[] }) {
  const hasInstagramEmbeds = posts.some((item) => !item.imageUrl);
  const updateCount = posts.length + reels.length;

  return (
    <section className="home-instagram__feed" aria-label="Latest Instagram updates">
      <header className="home-instagram__feed-heading">
        <div className="home-instagram__feed-title">
          <InstagramGlyph />
          <h3>Latest updates</h3>
        </div>
        <span className="home-instagram__count">
          {updateCount} update{updateCount === 1 ? '' : 's'}
        </span>
      </header>
      {posts.length > 0 ? <InstagramMediaGrid items={posts} label="Posts" /> : null}
      {reels.length > 0 ? <InstagramMediaGrid items={reels} label="Reels" /> : null}
      {hasInstagramEmbeds ? <InstagramEmbedScript /> : null}
    </section>
  );
}

function FeedSkeleton() {
  return (
    <section className="home-instagram__feed" aria-label="Latest Instagram updates">
      <header className="home-instagram__feed-heading">
        <div className="home-instagram__feed-title">
          <InstagramGlyph />
          <h3>Latest updates</h3>
        </div>
      </header>
      <div className="home-instagram__grid" data-count="8" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <span className="home-instagram__skeleton" key={index} />
        ))}
      </div>
    </section>
  );
}

export function InstagramFeedFallback() {
  return (
    <section className="home-instagram" aria-labelledby="home-instagram-title" aria-busy="true">
      <div className="home-instagram__inner">
        <SectionHeading />
        <FeedSkeleton />
      </div>
    </section>
  );
}

export function InstagramFeedSection({
  posts,
  reels,
}: {
  posts: InstagramMediaItem[];
  reels: InstagramMediaItem[];
}) {
  const orderedPosts = newestPostFirst(posts);
  const hasItems = orderedPosts.length > 0 || reels.length > 0;

  return (
    <section className="home-instagram" aria-labelledby="home-instagram-title">
      <div className="home-instagram__inner">
        <SectionHeading />
        {hasItems ? (
          <FeedGrid posts={orderedPosts} reels={reels} />
        ) : (
          <div className="home-instagram__empty">
            <p>Follow NUSC on Instagram for the latest matchday, training and club updates.</p>
            <a href={club.instagram} target="_blank" rel="noopener noreferrer">
              Follow @nagalandunited
              <ExternalLinkIcon />
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
