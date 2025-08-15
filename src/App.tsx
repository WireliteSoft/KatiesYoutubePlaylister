// src/App.tsx
import React, { useState, useEffect } from 'react';
import { Youtube } from 'lucide-react';
import type { Video, Playlist } from './types';
import { VideoInput } from './components/VideoInput';
import { VideoCollection } from './components/VideoCollection';
import { PlaylistManager } from './components/PlaylistManager';
import { VideoPlayer } from './components/VideoPlayer';
import { useLocalStorage } from './hooks/useLocalStorage';
import {
  loadRemote,
  saveRemote,
  mirrorToLocalStorage,
  readMirrorFromLocalStorage,
} from './utils/snapshot';

function App() {
  // Single source of truth keys — keep these as-is
  const [videos, setVideos] = useLocalStorage<Video[]>('videos', []);
  const [playlists, setPlaylists] = useLocalStorage<Playlist[]>('playlists', []);

  // UI state
  const [selectedVideos, setSelectedVideos] = useState<Video[]>([]);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  // ---------- Startup restore ----------
  // Remote (D1) -> non-empty mirror -> keep localStorage baseline
  useEffect(() => {
    (async () => {
      try {
        const remote = await loadRemote();
        if (remote && ((remote.videos?.length ?? 0) || (remote.playlists?.length ?? 0))) {
          setVideos(remote.videos);
          setPlaylists(remote.playlists);
          // keep a local snapshot too
          mirrorToLocalStorage(remote.videos, remote.playlists);
          return;
        }

        const mirror = readMirrorFromLocalStorage();
        if (mirror && ((mirror.videos?.length ?? 0) || (mirror.playlists?.length ?? 0))) {
          setVideos(mirror.videos);
          setPlaylists(mirror.playlists);
        }
        // else: do nothing, keep whatever useLocalStorage already had
      } catch {
        const mirror = readMirrorFromLocalStorage();
        if (mirror && ((mirror.videos?.length ?? 0) || (mirror.playlists?.length ?? 0))) {
          setVideos(mirror.videos);
          setPlaylists(mirror.playlists);
        }
      }
    })();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Persistence (debounced) ----------
  // Always mirror locally; remote is best-effort
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        mirrorToLocalStorage(videos, playlists);
      } catch {}
      saveRemote(videos, playlists).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [videos, playlists]);

  // ---------- Handlers ----------
  const handleVideoAdd = (video: Video) => {
    setVideos(prev => (prev.some(v => v.id === video.id) ? prev : [...prev, video]));
    setSelectedVideos(prev => (prev.some(v => v.id === video.id) ? prev : [...prev, video]));
  };

  const handleVideoSelect = (video: Video) => {
    setSelectedVideos(prev => (prev.some(v => v.id === video.id) ? prev : [...prev, video]));
  };

  const handleVideoDeselect = (video: Video) => {
    setSelectedVideos(prev => prev.filter(v => v.id !== video.id));
  };

  const handleVideoDelete = (video: Video) => {
    // remove from main list
    setVideos(prev => prev.filter(v => v.id !== video.id));
    // remove from selection
    setSelectedVideos(prev => prev.filter(v => v.id !== video.id));
    // strip from all playlists
    setPlaylists(prev =>
      prev.map(p => ({ ...p, videos: p.videos.filter(v => v.id !== video.id) })),
    );

    // if we were playing this exact video, advance or close
    if (currentVideo?.id === video.id) {
      if (currentPlaylist) {
        const remaining = currentPlaylist.videos.filter(v => v.id !== video.id);
        if (remaining.length > 0) {
          setCurrentPlaylist({ ...currentPlaylist, videos: remaining });
          setCurrentIndex(0);
          setCurrentVideo(remaining[0]);
        } else {
          setCurrentPlaylist(null);
          setCurrentIndex(null);
          setCurrentVideo(null);
          setIsPlayerOpen(false);
        }
      } else {
        setCurrentVideo(null);
        setCurrentIndex(null);
        setIsPlayerOpen(false);
      }
    }
  };

  const handleCreatePlaylist = (name: string, description: string, vids: Video[]) => {
    const newPlaylist: Playlist = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      videos: [...vids],
      createdAt: new Date().toISOString(),
      thumbnail: vids[0]?.thumbnail,
    };
    setPlaylists(prev => [...prev, newPlaylist]);
    setSelectedVideos([]);
  };

  const handleReorderPlaylist = (id: string, newOrder: Video[]) => {
    setPlaylists(prev => prev.map(p => (p.id === id ? { ...p, videos: newOrder } : p)));

    // if currently playing that playlist, keep the player in sync
    if (currentPlaylist?.id === id) {
      setCurrentPlaylist(prev => (prev ? { ...prev, videos: newOrder } : prev));

      if (currentVideo) {
        const idx = newOrder.findIndex(v => v.id === currentVideo.id);
        if (idx >= 0) {
          setCurrentIndex(idx);
        } else {
          setCurrentIndex(newOrder.length ? 0 : null);
          setCurrentVideo(newOrder[0] ?? null);
        }
      } else if (newOrder.length) {
        setCurrentIndex(0);
        setCurrentVideo(newOrder[0]);
      } else {
        setCurrentIndex(null);
      }
    }
  };

  const handleDeletePlaylist = async (id: string) => {
    // try to delete on server, but update UI regardless
    try {
      const res = await fetch(`/api/playlists/${id}`, { method: 'DELETE' });
      if (!res.ok) console.error('[Delete playlist] server returned', res.status);
    } catch (e) {
      console.error('[Delete playlist] network error:', e);
    }

    setPlaylists(prev => prev.filter(p => p.id !== id));

    if (currentPlaylist?.id === id) {
      setCurrentPlaylist(null);
      setCurrentIndex(null);
      setCurrentVideo(null);
      setIsPlayerOpen(false);
    }
  };

  const handleClearSelection = () => setSelectedVideos([]);

  const handleVideoPlay = (video: Video) => {
    setCurrentPlaylist(null);
    setCurrentVideo(video);
    setCurrentIndex(null);
    setIsPlayerOpen(true);
  };

  const handlePlaylistPlay = (playlist: Playlist) => {
    if (playlist.videos.length === 0) return;
    setCurrentPlaylist(playlist);
    setCurrentIndex(0);
    setCurrentVideo(playlist.videos[0]);
    setIsPlayerOpen(true);
  };

  const handleNext = () => {
    if (!currentPlaylist || currentIndex === null) return;
    const next = (currentIndex + 1) % currentPlaylist.videos.length;
    setCurrentIndex(next);
    setCurrentVideo(currentPlaylist.videos[next]);
  };

  const handlePrevious = () => {
    if (!currentPlaylist || currentIndex === null) return;
    const len = currentPlaylist.videos.length;
    const prev = (currentIndex - 1 + len) % len;
    setCurrentIndex(prev);
    setCurrentVideo(currentPlaylist.videos[prev]);
  };

  // ---------- UI ----------
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Youtube className="w-8 h-8 text-red-500" />
            <h1 className="text-2xl font-bold text-white">YouTube Collection Manager</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            <VideoInput onVideoAdd={handleVideoAdd} />
            <PlaylistManager
              playlists={playlists}
              videos={videos}
              selectedVideos={selectedVideos}
              onCreatePlaylist={handleCreatePlaylist}
              onDeletePlaylist={handleDeletePlaylist}
              onPlayPlaylist={handlePlaylistPlay}
              onClearSelection={handleClearSelection}
              onReorderPlaylist={handleReorderPlaylist}
            />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2">
            <VideoCollection
              videos={videos}
              selectedVideos={selectedVideos}
              onVideoPlay={handleVideoPlay}
              onVideoSelect={handleVideoSelect}
              onVideoDeselect={handleVideoDeselect}
              onVideoDelete={handleVideoDelete}
            />
          </div>
        </div>
      </div>

      <VideoPlayer
        video={currentVideo}
        playlist={currentPlaylist}
        isOpen={isPlayerOpen}
        onClose={() => setIsPlayerOpen(false)}
        onNext={handleNext}
        onPrevious={handlePrevious}
        currentIndex={currentIndex}
      />
    </div>
  );
}

export default App;
