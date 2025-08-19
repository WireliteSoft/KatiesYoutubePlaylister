import React, { useEffect, useMemo, useRef } from 'react';
import { X, SkipBack, SkipForward } from 'lucide-react';
import { Video, Playlist } from '../types';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface VideoPlayerProps {
  video: Video | null;
  playlist: Playlist | null;
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  currentIndex?: number | null;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  playlist,
  isOpen,
  onClose,
  onNext,
  onPrevious,
  currentIndex,
}) => {
  const playerRef = useRef<any>(null);
  const iframeIdRef = useRef<string>('yt-embed-fixed'); // stable
  const scriptAddedRef = useRef(false);

  // track currently-rendered video id so we can detect if parent advanced
  const lastVideoIdRef = useRef<string | null>(null);
  useEffect(() => {
    lastVideoIdRef.current = video?.id ?? null;
  }, [video?.id]);

  // simple guard against spamming advance()
  const advancingRef = useRef(false);

  // fallback timer that checks if the video is basically finished
  const pollTimerRef = useRef<number | null>(null);
  const startPoll = () => {
    stopPoll();
    if (!playerRef.current?.getDuration) return;
    pollTimerRef.current = window.setInterval(() => {
      try {
        const dur = playerRef.current.getDuration?.() ?? 0;
        const t = playerRef.current.getCurrentTime?.() ?? 0;
        if (dur > 0 && dur - t <= 0.4) {
          advance();
        }
      } catch {}
    }, 1000);
  };
  const stopPoll = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const advance = () => {
    if (advancingRef.current) return;
    advancingRef.current = true;

    const before = lastVideoIdRef.current;

    // 1) Ask parent to advance
    try { onNext(); } catch {}

    // 2) If parent didn’t swap the video prop shortly, do it locally
    window.setTimeout(() => {
      if (lastVideoIdRef.current === before && playlist && playerRef.current?.loadVideoById) {
        const idx =
          typeof currentIndex === 'number'
            ? currentIndex
            : playlist.videos.findIndex(v => v.id === before);
        const next = (idx >= 0 && idx + 1 < playlist.videos.length)
          ? playlist.videos[idx + 1]
          : null;

        if (next) {
          try {
            playerRef.current.loadVideoById(next.id);
            playerRef.current.playVideo?.();
            lastVideoIdRef.current = next.id;
          } catch (e) {
            console.warn('Local advance loadVideoById failed:', e);
          }
        }
      }
      advancingRef.current = false;
    }, 500);
  };

  // Load YouTube Iframe API once
  useEffect(() => {
    if (window.YT?.Player) return;
    if (scriptAddedRef.current) return;
    scriptAddedRef.current = true;

    const scriptId = 'youtube-iframe-api';
    if (!document.getElementById(scriptId)) {
      const tag = document.createElement('script');
      tag.id = scriptId;
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }
  }, []);

  // Initialize player once; on new videos, use loadVideoById
  useEffect(() => {
    if (!isOpen || !video) return;

    const init = () => {
      if (playerRef.current?.loadVideoById) {
        try {
          playerRef.current.loadVideoById(video.id);
          playerRef.current.playVideo?.();
          startPoll();
        } catch (e) {
          console.warn('YouTube loadVideoById failed:', e);
        }
        return;
      }

      if (!window.YT?.Player) return;

      playerRef.current = new window.YT.Player(iframeIdRef.current, {
        videoId: video.id,
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (e: any) => {
            try { e?.target?.playVideo?.(); } catch {}
            startPoll();
          },
          onStateChange: (event: any) => {
            const YTConst = window.YT?.PlayerState;
            const state = event?.data;

            if (YTConst && state === YTConst.ENDED) {
              advance();
            } else if (YTConst && state === YTConst.PLAYING) {
              startPoll();
            } else if (YTConst && (state === YTConst.PAUSED || state === YTConst.BUFFERING)) {
              // keep polling; no-op
            }
          },
          onError: (_e: any) => {
            // Skip broken/unavailable videos
            advance();
          },
        },
      });
    };

    if (window.YT?.Player) {
      init();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        try { prev && prev(); } catch {}
        init();
      };
      return () => {
        window.onYouTubeIframeAPIReady = prev || (() => {});
      };
    }
  }, [isOpen, video?.id, playlist, onNext, currentIndex]);

  // Destroy on close
  useEffect(() => {
    if (!isOpen) {
      stopPoll();
      if (playerRef.current?.destroy) {
        try { playerRef.current.destroy(); } catch {}
      }
      playerRef.current = null;
      advancingRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen || !video) return null;

  const index =
    typeof currentIndex === 'number'
      ? currentIndex
      : (playlist ? playlist.videos.findIndex(v => v.id === video.id) : -1);

  const hasPrevious = !!playlist && index > 0;
  const hasNext = !!playlist && index > -1 && index < (playlist?.videos.length ?? 0) - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-5xl bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="text-white font-semibold truncate pr-4">
            {video.title || 'Now Playing'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
            aria-label="Close player"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player container (YT owns this element) */}
        <div className="relative w-full aspect-video bg-black">
          <div id={iframeIdRef.current} className="absolute inset-0 w-full h-full" />
        </div>

        {playlist && (
          <div className="flex items-center justify-between p-4 border-t border-gray-800">
            <button
              onClick={onPrevious}
              disabled={!hasPrevious}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                hasPrevious
                  ? 'bg-gray-800 hover:bg-gray-700 text-white'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
              title="Previous"
            >
              <SkipBack className="w-4 h-4" />
              Previous
            </button>

            <div className="text-gray-300 text-sm">
              {index > -1 ? `Video ${index + 1} of ${playlist.videos.length}` : ''}
            </div>

            <button
              onClick={onNext}
              disabled={!hasNext}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                hasNext
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
              title="Next"
            >
              Next
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
