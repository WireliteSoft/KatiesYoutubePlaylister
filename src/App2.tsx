import React, { useState } from 'react';
import { Youtube } from 'lucide-react';
import { Video, Playlist } from './types';
import { VideoInput } from './components/VideoInput';
import { VideoCollection } from './components/VideoCollection';
import { PlaylistManager } from './components/PlaylistManager';
import { VideoPlayer } from './components/VideoPlayer';
import { useLocalStorage } from './hooks/useLocalStorage';

function App() {
  const [videos, setVideos] = useLocalStorage<Video[]>('videos', []);
  const [playlists, setPlaylists] = useLocalStorage<Playlist[]>('playlists', []);
  const [selectedVideos, setSelectedVideos] = useState<Video[]>([]);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

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
    setVideos(prev => prev.filter(v => v.id !== video.id));
    setSelectedVideos(prev => prev.filter(v => v.id !== video.id));
    setPlaylists(prev => prev.map(p => ({ ...p, videos: p.videos.filter(v => v.id !== video.id) })));
    if (currentVideo?.id === video.id) {
      setIsPlayerOpen(false);
      setCurrentVideo(null);
      setCurrentPlaylist(null);
      setCurrentIndex(null);
    }
  };

  const handleCreatePlaylist = (name: string, description: string, vids: Video[]) => {
    if (vids.length === 0) return;
    const newPlaylist: Playlist = {
      id: crypto.randomUUID(),
      name,
      description,
      videos: [...vids],
      createdAt: new Date().toISOString(),
      thumbnail: vids[0]?.thumbnail,
    };
    setPlaylists(prev => [...prev, newPlaylist]);
  };

  const handleDeletePlaylist = (id: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
    if (currentPlaylist?.id === id) {
      setIsPlayerOpen(false);
      setCurrentPlaylist(null);
      setCurrentVideo(null);
      setCurrentIndex(null);
    }
  };

  const handleReorderPlaylist = (id: string, newOrder: Video[]) => {
    setPlaylists(prev => prev.map(p => (p.id === id ? { ...p, videos: newOrder } : p)));
    if (currentPlaylist?.id === id) {
      setCurrentPlaylist(p => (p ? { ...p, videos: newOrder } : p));
      if (currentVideo) {
        const idx = newOrder.findIndex(v => v.id === currentVideo.id);
        setCurrentIndex(idx !== -1 ? idx : 0);
      }
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
              onClearSelection={handleVideoDeselect.bind(null as any)} // optional: hook to clear one? kept API
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
