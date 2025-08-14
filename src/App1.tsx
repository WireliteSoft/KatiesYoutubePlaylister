import React, { useState, useEffect } from 'react';
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
    setVideos(prev => {
      const exists = prev.find(v => v.id === video.id);
      if (exists) return prev;
      return [...prev, video];
    });
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
  setSelectedVideos(prev => prev.some(v => v.id === video.id) ? prev : [...prev, video]);
};

  const handleVideoDeselect = (video: Video) => {
    setSelectedVideos(prev => prev.filter(v => v.id !== video.id));
  };

  const handleVideoDelete = (video: Video) => {
    // Remove from videos collection
    setVideos(prev => prev.filter(v => v.id !== video.id));
    
    // Remove from selected videos if it was selected
    setSelectedVideos(prev => prev.filter(v => v.id !== video.id));
    
    // Remove from all playlists
    setPlaylists(prev => prev.map(playlist => ({
      ...playlist,
      videos: playlist.videos.filter(v => v.id !== video.id)
    })));
    
    // Close player if this video is currently playing
    if (currentVideo?.id === video.id) {
      setIsPlayerOpen(false);
      setCurrentVideo(null);
      setCurrentPlaylist(null);
    }
  };
  const handleClearSelection = () => {
    setSelectedVideos([]);
  };

  const handleCreatePlaylist = (name: string, description: string, videos: Video[]) => {
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name,
      description,
      videos: [...videos],
      createdAt: new Date().toISOString(),
      thumbnail: videos[0]?.thumbnail,
    };
    setPlaylists(prev => [...prev, newPlaylist]);
  };

  const handleDeletePlaylist = (id: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
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
              onClearSelection={handleClearSelection}
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