'use client';

import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8.2 5.5c-.8-.5-1.8.1-1.8 1v11c0 .9 1 1.5 1.8 1l9-5.5a1.2 1.2 0 0 0 0-2l-9-5.5Z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 5.5h3.2v13H8zM14 5.5h3.2v13H14z" fill="currentColor" />
    </svg>
  );
}

export function AutoplayReelVideo({
  src,
  poster,
  title,
}: {
  src: string;
  poster: string;
  title: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const userPausedRef = useRef(false);
  const hideControlsUntilLeaveRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const playVideo = useCallback(async () => {
    const video = videoRef.current;
    if (!video || hasError) return;

    video.muted = true;
    try {
      await video.play();
    } catch {
      setIsPlaying(false);
    }
  }, [hasError]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(motionPreference.matches);

    let isInView = false;
    const observer = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(([entry]) => {
          isInView = Boolean(entry?.isIntersecting);
          if (isInView && !userPausedRef.current && !motionPreference.matches) {
            void playVideo();
          } else if (!isInView) {
            video.pause();
          }
        }, { threshold: 0.4 });

    if (observer) observer.observe(video);
    else if (!motionPreference.matches) void playVideo();

    const onMotionPreferenceChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
      if (event.matches) video.pause();
      else if (isInView && !userPausedRef.current) void playVideo();
    };
    motionPreference.addEventListener('change', onMotionPreferenceChange);

    return () => {
      observer?.disconnect();
      motionPreference.removeEventListener('change', onMotionPreferenceChange);
      video.pause();
    };
  }, [playVideo]);

  const controlsVisible = !isPlaying || isFocused || (isHovered && !hideControlsUntilLeaveRef.current);

  function handlePointerEnter(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'touch' && !hideControlsUntilLeaveRef.current) {
      setIsHovered(true);
    }
  }

  function handlePointerLeave(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'touch') return;
    hideControlsUntilLeaveRef.current = false;
    setIsHovered(false);
  }

  function togglePlayback(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      userPausedRef.current = false;
      hideControlsUntilLeaveRef.current = true;
      setIsHovered(false);
      void playVideo();
      if (event.detail > 0) buttonRef.current?.blur();
    } else {
      userPausedRef.current = true;
      hideControlsUntilLeaveRef.current = false;
      setIsHovered(true);
      video.pause();
    }
  }

  function revealControlsFromVideo(event: MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('button')) return;
    if (!videoRef.current?.paused) {
      hideControlsUntilLeaveRef.current = false;
      setIsHovered(true);
    }
  }

  return (
    <div
      className="home-instagram__reel-player"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerMove={(event) => {
        if (event.pointerType !== 'touch' && hideControlsUntilLeaveRef.current) {
          hideControlsUntilLeaveRef.current = false;
          setIsHovered(true);
        }
      }}
      onClick={revealControlsFromVideo}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsFocused(false);
        }
      }}
    >
      <video
        ref={videoRef}
        className="home-instagram__reel-video"
        src={src}
        poster={poster}
        muted
        playsInline
        loop
        preload="metadata"
        aria-hidden="true"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => setHasError(true)}
      />
      <button
        ref={buttonRef}
        className="home-instagram__reel-control"
        type="button"
        data-visible={controlsVisible}
        aria-label={`${isPlaying ? 'Pause' : 'Play'} ${title}`}
        aria-pressed={isPlaying}
        disabled={hasError}
        title={prefersReducedMotion ? 'Play video' : undefined}
        onClick={togglePlayback}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
    </div>
  );
}
