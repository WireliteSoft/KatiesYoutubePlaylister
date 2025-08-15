// src/App.tsx
import React, { useState } from 'react';
import { Youtube } from 'lucide-react';
import { Video, Playlist } from './types';
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
  const [videos, setVideos] = useLocalStorage<Video[]>('videos', []);
  const [playlists, setPlaylists] = useLocalStorage<Playlist[]>('playlists', []);
  const [selectedVideos, setSelectedVideos] = useState<Video[]>([]);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  // On load: try REMOTE (D1) first, then local mirror fallback
  React.useEffect(() => {
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
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVideoAdd = (video: Video) => {
    setVideos(prev => (prev.some(v => v.id === video.id) ? prev : [...prev, video]));
  };

  const handleVideoPlay = (video: Video) => {
    setCurrentVideo(video);
    setCurrentPlaylist(null);
    setCurrentIndex(null);
    setIsPlayerOpen(true);
  };

  const handlePlaylistPlay = (playlist: Playlist) => {
    if (playlist.videos.length > 0) {
      setCurrentPlaylist(playlist);
      setCurrentIndex(0);
      setCurrentVideo(playlist.videos[0]);
      setIsPlayerOpen(true);
    }
  };

  const handleVideoSelect = (video: Video) => {
    setSelectedVideos(prev => (prev.some(v => v.id === video.id) ? prev : [...prev, video]));
  };

  const handleVideoDeselect = (video: Video) => {
    setSelectedVideos(prev => prev.filter(v => v.id !== video.id));
  };

  const handleVideoDelete = (video: Video) => {
    // Remove from videos collection
    setVideos(prev => prev.filter(v => v.id !== video.id));

    // Remove from selected videos
    setSelectedVideos(prev => prev.filter(v => v.id !== video.id));

    // Remove from all playlists
    setPlaylists(prev =>
      prev.map(p => ({ ...p, videos: p.videos.filter(v => v.id !== video.id) })),
    );

    // Close player if this video is currently playing
    if (currentVideo?.id === video.id) {
      setIsPlayerOpen(false);
      setCurrentVideo(null);
      setCurrentPlaylist(null);
      setCurrentIndex(null);
    }
  };

  const handleClearSelection = () => {
    setSelectedVideos([]);
  };

  // Your existing create handler
  const handleCreatePlaylist = (name: string, description: string, vids: Video[]) => {
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name,
      description,
      videos: [...vids],
      createdAt: new Date().toISOString(),
      thumbnail: vids[0]?.thumbnail,
    };
    setPlaylists(prev => [...prev, newPlaylist]);
  };

  // Reorder handler (keeps currently playing state in sync)
  const handleReorderPlaylist = (id: string, newOrder: Video[]) => {
    // Update the playlists array
    setPlaylists(prev => prev.map(p => (p.id === id ? { ...p, videos: newOrder } : p)));

    // If the currently viewed/playing playlist is the same, sync it too
    setCurrentPlaylist(prev => (prev && prev.id === id ? { ...prev, videos: newOrder } : prev));

    // Keep currentIndex aligned with the same currentVideo (if any)
    if (currentPlaylist?.id === id) {
      if (currentVideo) {
        const idx = newOrder.findIndex(v => v.id === currentVideo.id);
        if (idx !== -1) {
          setCurrentIndex(idx);
        } else {
          // Current video no longer in list; move to first item (or clear)
          setCurrentIndex(newOrder.length ? 0 : null);
          setCurrentVideo(newOrder[0] ?? null);
        }
      } else {
        // No current video; if list has items, set to first
        if (newOrder.length) {
          setCurrentIndex(0);
          setCurrentVideo(newOrder[0]);
        } else {
          setCurrentIndex(null);
        }
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
    setCurrentVideo(null);
    setCurrentIndex(null);
  }
};


  const handleNext = () => {
    if (currentPlaylist != null && currentIndex != null) {
      if (currentIndex < currentPlaylist.videos.length - 1) {
        const next = currentIndex + 1;
        setCurrentIndex(next);
        setCurrentVideo(currentPlaylist.videos[next]);
      }
    }
  };

  const handlePrevious = () => {
    if (currentPlaylist != null && currentIndex != null) {
      if (currentIndex > 0) {
        const prev = currentIndex - 1;
        setCurrentIndex(prev);
        setCurrentVideo(currentPlaylist.videos[prev]);
      }
    }
  };

  // On change: push REMOTE (D1) + mirror locally (debounced)
  React.useEffect(() => {
    const t = setTimeout(() => {
      try {
        saveRemote(videos, playlists);             // shared across devices
        mirrorToLocalStorage(videos, playlists);   // local safety copy
      } catch (e) {
        console.warn('[save] failed:', e);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [videos, playlists]);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
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
            />
          </div>

          {/* Right Column - Video Collection */}
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

      {/* Video Player Modal */}
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
