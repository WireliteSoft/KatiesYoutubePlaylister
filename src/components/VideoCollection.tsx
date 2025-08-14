import React, { useState } from 'react';
import { Search, Grid, List, CheckCircle } from 'lucide-react';
import { Video } from '../types';
import { VideoCard } from './VideoCard';

interface VideoCollectionProps {
  videos: Video[];
  selectedVideos: Video[];
  onVideoPlay: (video: Video) => void;
  onVideoSelect: (video: Video) => void;
  onVideoDeselect: (video: Video) => void;
  onVideoDelete: (video: Video) => void;
}

export const VideoCollection: React.FC<VideoCollectionProps> = ({
  videos,
  selectedVideos,
  onVideoPlay,
  onVideoSelect,
  onVideoDeselect,
  onVideoDelete,
}) => {
    const [showDelete, setShowDelete] = useState(false);
const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredVideos = videos.filter(video =>
    video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    video.channelTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isSelected = (video: Video) => selectedVideos.some(v => v.id === video.id);

  const handleVideoCardClick = (video: Video) => {
    if (isSelected(video)) {
      onVideoDeselect(video);
    } else {
      onVideoSelect(video);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-600 bg-gray-700"
            checked={showDelete}
            onChange={(e) => setShowDelete(e.target.checked)}
          />
          Delete videos
        </label>
        <h2 className="text-2xl font-bold text-white">
          Video Collection ({filteredVideos.length})
        </h2>
        
        {selectedVideos.length > 0 && (
          <div className="text-green-400 font-medium">
            {selectedVideos.length} selected
          </div>
        )}
      </div>

      {/* Search and View Controls */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search videos..."
            className="w-full pl-10 pr-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex bg-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-3 transition-colors ${
              viewMode === 'grid' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-3 transition-colors ${
              viewMode === 'list' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Video Grid/List */}
      {filteredVideos.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <p className="text-xl mb-2">
            {videos.length === 0 ? 'No videos added yet' : 'No videos match your search'}
          </p>
          <p>
            {videos.length === 0 
              ? 'Start by pasting a YouTube URL above'
              : 'Try a different search term'
            }
          </p>
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
        }>
          {filteredVideos.map((video) => (
            <div key={video.id} className="relative">
              {isSelected(video) && (
                <div className="absolute top-2 left-2 z-10 bg-green-500 text-white rounded-full p-1">
                  <CheckCircle className="w-5 h-5 fill-current" />
                </div>
              )}
              <div
                className={`cursor-pointer transition-all ${
                  isSelected(video) ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-gray-900' : ''
                }`}
                onClick={() => handleVideoCardClick(video)}
              >
                <VideoCard
                  video={video}
                  onPlay={onVideoPlay}
                  onAddToPlaylist={() => handleVideoCardClick(video)}
                  onDelete={onVideoDelete}
                  showDelete={showDelete}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
