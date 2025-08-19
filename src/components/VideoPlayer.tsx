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

  // Stable container id for the whole component lifetime
  const iframeIdRef = useRef<string>('yt-embed-fixed');

  // ---- Load YouTube Iframe API once ----
  const scriptAddedRef = useRef(false);
  useEffect(() => {
    if (window.YT && window.YT.Player) return;
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

  // ---- Initialize player once; load new videos via API (do NOT change iframe src) ----
  useEffect(() => {
    if (!isOpen || !video) return;

    const init = () => {
      // If a player already exists, just load the new video (reuse same iframe)
      if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
        try {
          playerRef.current.loadVideoById(video.id);
          playerRef.current.playVideo?.();
        } catch (e) {
          console.warn('YouTube loadVideoById failed:', e);
        }
        return;
      }

      if (!window.YT || !window.YT.Player) return;

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
          onReady: (e: any) => e?.target?.playVideo?.(),
          onStateChange: (event: any) => {
            const ENDED = window.YT?.PlayerState?.ENDED ?? 0;
            if (event?.data === ENDED && playlist) {
              onNext();
            }
          },
        },
      });
    };

    // API already loaded
    if (window.YT && window.YT.Player) {
      init();
      return;
    }

    // Attach a ready callback ONE time per mount of this effect
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev && prev();
      init();
    };

    // Cleanup the ready callback on effect cleanup
    return () => {
      window.onYouTubeIframeAPIReady = prev || (() => {});
    };
  }, [isOpen, video?.id, playlist, onNext]);

  // Optional: destroy on close to avoid zombies
  useEffect(() => {
    if (!isOpen && playerRef.current?.destroy) {
      try { playerRef.current.destroy(); } catch {}
      playerRef.current = null;
    }
  }, [isOpen]);

  if (!isOpen || !video) return null;

  const index = (typeof currentIndex === 'number'
    ? currentIndex
    : (playlist ? playlist.videos.findIndex(v => v.id === video.id) : -1));
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

        {/* Player container: IMPORTANT — no <iframe src>. YT API owns this element. */}
        <div className="relative w-full aspect-video bg-black">
          <div
            id={iframeIdRef.current}
            className="absolute inset-0 w-full h-full"
          />
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
