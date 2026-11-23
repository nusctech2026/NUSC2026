'use client';

import { useState } from 'react';

type YoutubeHighlightCardProps = {
  videoId: string;
  category: string;
  title: string;
};

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 6.5v11l9-5.5-9-5.5Z" fill="currentColor" />
    </svg>
  );
}

export function YoutubeHighlightCard({
  videoId,
  category,
  title,
}: YoutubeHighlightCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div
      className={`home-youtube__card${isPlaying ? ' home-youtube__card--playing' : ''}`}
    >
      {isPlaying ? (
        <>
          <iframe
            className="home-youtube__player"
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
          <a
            className="home-youtube__external"
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${title} on YouTube in a new tab`}
          >
            YouTube
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M14 5h5v5m0-5-8 8M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
          <button
            className="home-youtube__close"
            type="button"
            onClick={() => setIsPlaying(false)}
            aria-label={`Close ${title} player`}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="m6 6 12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </>
      ) : (
        <button
          className="home-youtube__launch"
          type="button"
          onClick={() => setIsPlaying(true)}
          aria-label={`Play ${title} on this page`}
        >
          <img
            className="home-youtube__thumbnail"
            src={`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`}
            alt=""
            width={1280}
            height={720}
            loading="lazy"
            decoding="async"
          />
          <span className="home-youtube__shade" aria-hidden="true" />
          <span className="home-youtube__play" aria-hidden="true">
            <PlayIcon />
          </span>
          <span className="home-youtube__card-copy" aria-hidden="true">
            <span className="home-youtube__category">{category}</span>
            <span className="home-youtube__title">{title}</span>
          </span>
        </button>
      )}
    </div>
  );
}
