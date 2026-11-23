export type InstagramMediaFormat = 'photo' | 'carousel' | 'reel';

export type InstagramMediaItem = {
  id: string;
  title: string;
  alt: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  permalink: string;
  format: InstagramMediaFormat;
};

export type InstagramFeed = {
  posts: InstagramMediaItem[];
  reels: InstagramMediaItem[];
};
