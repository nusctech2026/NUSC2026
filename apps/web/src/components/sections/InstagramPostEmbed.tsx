'use client';

import Script from 'next/script';

declare global {
  interface Window {
    instgrm?: {
      Embeds: {
        process: () => void;
      };
    };
  }
}

export function InstagramPostEmbed({ permalink, title }: { permalink: string; title: string }) {
  return (
    <blockquote
      className="instagram-media"
      data-instgrm-permalink={permalink}
      data-instgrm-version="14"
      aria-label={`Instagram post: ${title}`}
    >
      <a href={permalink} target="_blank" rel="noopener noreferrer">
        View this post on Instagram
      </a>
    </blockquote>
  );
}

export function InstagramEmbedScript() {
  return (
    <Script
      src="https://www.instagram.com/embed.js"
      strategy="lazyOnload"
      onReady={() => window.instgrm?.Embeds.process()}
    />
  );
}
