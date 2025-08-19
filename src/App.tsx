// src/App.tsx
import React, { useState, useEffect } from 'react';
import { Youtube } from 'lucide-react';
import { Video, Playlist } from './types';
import { VideoInput } from './components/VideoInput';
import { VideoCollection } from './components/VideoCollection';
import { PlaylistManager } from './components/PlaylistManager';
import { VideoPlayer } from './components/VideoPlayer';
import { useLocalStorage } from './hooks/useLocalStorage';
import { loadRemote, saveRemote, mirrorToLocalStorage, readMirrorFromLocalStorage, upsertPlaylistMapping } from './utils/snapshot';

function App() {
  const [videos, setVideos] = useLocalStorage<Video[]>('videos', []);
  const [playlists, setPlaylists] = useLocalStorage<Playlist[]>('playlists', []);
  const [selectedVideos, setSelectedVideos] = useState<Video[]>([]);

  // PLAYBACK STATE (playlist-only)
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  // ===== Derived: single source of truth =====
  const currentVideo: Video | null =
    currentPlaylist && currentIndex != null
      ? currentPlaylist.videos[currentIndex] ?? null
      : null;

  // ===== Initial data restore =====
  useEffect(() => {
    (async () => {
      try {
        const remote = await loadRemote();
        if (remote && (remote.videos.length || remote.playlists.length)) {
          setVideos(remote.videos);
          setPlaylists(remote.playlists);
          return;
        }
        const mirror = readMirrorFromLocalStorage();
        if (mirror) {
          setVideos(mirror.videos);
          setPlaylists(mirror.playlists);
        }
      } catch (e) {
        console.warn('[restore] failed:', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Core handlers =====
  const handleVideoAdd = (video: Video) => {
    setVideos(prev => (prev.some(v => v.id === video.id) ? prev : [video, ...prev]));
  };

  // Start playing a playlist (always playlist mode)
  const handlePlaylistPlay = (playlist: Playlist) => {
    if (!playlist.videos.length) return;
    setCurrentPlaylist(playlist);
    setCurrentIndex(0);
    setIsPlayerOpen(true);
  };

  // If UI allows “play” on a single video, we still keep playlist-only by
  // creating a 1-item temporary playlist. (Not a separate single-play mode.)
  const handleVideoPlay = (video: Video) => {
    const temp: Playlist = {
      id: '__temp__',
      name: 'Now Playing',
      description: '',
      videos: [video],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setCurrentPlaylist(temp);
    setCurrentIndex(0);
    setIsPlayerOpen(true);
  };

  const handleNext = () => {
    if (!currentPlaylist || currentIndex == null) return;
    setCurrentIndex(i => {
      if (i == null) return i as any;
      const next = i + 1;
      return next < currentPlaylist.videos.length ? next : i; // no wrap; change if desired
    });
  };

  const handlePrevious = () => {
    if (!currentPlaylist || currentIndex == null) return;
    setCurrentIndex(i => (i != null && i > 0 ? i - 1 : i));
  };

  const handleVideoSelect = (video: Video) => {
    setSelectedVideos(prev => (prev.some(v => v.id === video.id) ? prev : [...prev, video]));
  };

  const handleVideoDeselect = (video: Video) => {
    setSelectedVideos(prev => prev.filter(v => v.id !== video.id));
  };

  const handleClearSelection = () => setSelectedVideos([]);

  const handleVideoDelete = (video: Video) => {
    setVideos(prev => prev.filter(v => v.id !== video.id));
    setSelectedVideos(prev => prev.filter(v => v.id !== video.id));
    setPlaylists(prev =>
      prev.map(p => ({ ...p, videos: p.videos.filter(v => v.id !== video.id) })),
    );

    if (currentVideo?.id === video.id) {
      setIsPlayerOpen(false);
      setCurrentPlaylist(null);
      setCurrentIndex(null);
    }
  };

  const handleCreatePlaylist = (name: string, description: string, vids: Video[]) => {
    if (!vids.length) return;
    const exists = playlists.some(p => p.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      alert('A playlist with that name already exists.');
      return;
    }
    const newPlaylist: Playlist = {
      id: crypto.randomUUID(),
      name,
      description,
      videos: vids,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setPlaylists(prev => [newPlaylist, ...prev]);
  };

  const handleReorderPlaylist = (playlistId: string, newOrder: Video[]) => {
    setPlaylists(prev =>
      prev.map(p => (p.id === playlistId ? { ...p, videos: newOrder, updatedAt: Date.now() } : p)),
    );

    // If the currently playing playlist is being reordered, adjust currentIndex to keep playing the same video
    if (currentPlaylist?.id === playlistId) {
      const playingId = currentVideo?.id ?? null;
      if (playingId) {
        const newIdx = newOrder.findIndex(v => v.id === playingId);
        setCurrentIndex(newIdx !== -1 ? newIdx : newOrder.length ? 0 : null);
      } else {
        setCurrentIndex(newOrder.length ? 0 : null);
      }
    }
  };

  const handleDeletePlaylist = async (id: string) => {
    try {
      const res = await fetch(`/api/playlists/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const msg = await res.text();
        console.error('[Delete playlist] server error:', msg);
        alert('Failed to delete playlist on server.');
        return;
      }
    } catch (e) {
      console.error('[Delete playlist] network error:', e);
      alert('Failed to reach server.');
      return;
    }

    setPlaylists(prev => prev.filter(p => p.id !== id));

    if (currentPlaylist?.id === id) {
      setIsPlayerOpen(false);
      setCurrentPlaylist(null);
      setCurrentIndex(null);
    }
  };


// Append the current selection to an existing playlist (deduped), then persist to DB
const handleAddSelectedToPlaylist = async (playlistId: string) => {
  if (!selectedVideos.length) return;

  // find current snapshot of the target playlist
  const target = playlists.find(p => p.id === playlistId);
  if (!target) return;

  // dedupe: ignore any already in the playlist
  const existing = new Set(target.videos.map(v => v.id));
  const toAppend = selectedVideos.filter(v => !existing.has(v.id));
  if (toAppend.length === 0) return;

  // new list for that playlist
  const newVideos = [...target.videos, ...toAppend];

  // 1) optimistic local update (UI updates immediately)
  setPlaylists(prev => prev.map(p => (p.id === playlistId ? { ...p, videos: newVideos } : p)));

  // 2) persist to DB: merge mode replaces ONLY this playlist's mapping
  try {
    await upsertPlaylistMapping(playlistId, newVideos.map(v => v.id));
  } catch (e) {
    console.error('[append -> persist] failed:', e);
    alert('Failed to save playlist changes to the server.');
    // optional: revert UI on failure
    // setPlaylists(prev => prev.map(p => (p.id === playlistId ? target : p)));
  }
};

  

  // ===== Persist changes (debounced) =====
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        saveRemote(videos, playlists);
        mirrorToLocalStorage(videos, playlists);
      } catch (e) {
        console.warn('[sync] failed:', e);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [videos, playlists]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
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
          {/* Left Column - Video Input and Playlists */}
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
              onAddSelectedToPlaylist={handleAddSelectedToPlaylist}
            />
          </div>

          {/* Right Column - Video Collection */}
          <div className="lg:col-span-2">
            <VideoCollection
              videos={videos}
              selectedVideos={selectedVideos}
              onSelectVideo={handleVideoSelect}
              onDeselectVideo={handleVideoDeselect}
              onDeleteVideo={handleVideoDelete}
              // If your UI has “play” on a single video, this still uses playlist-only
              onPlayVideo={handleVideoPlay}
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
