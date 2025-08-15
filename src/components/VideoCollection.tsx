import React, { useState } from 'react';
import { Search, Grid, List } from 'lucide-react';
import { Video } from '../types';
import { VideoCard } from './VideoCard';

interface VideoCollectionProps {
  videos: Video[];
  selectedVideos: Video[];
  onVideoPlay: (video: Video) => void;
  onVideoSelect: (video: Video) => void;
  onVideoDeselect: (video: Video) => void;
  onVideoDelete: (video: Video) => void;
  onToggleSelectAll?: () => void;  // added
  allSelected?: boolean;           // added
}

export const VideoCollection: React.FC<VideoCollectionProps> = ({
  videos,
  selectedVideos,
  onVideoPlay,
  onVideoSelect,
  onVideoDeselect,
  onVideoDelete,
  onToggleSelectAll,   // added
  allSelected,         // added
}) => {
  const [showDelete, setShowDelete] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredVideos = videos.filter(v => {
    const t = searchTerm.toLowerCase();
    return v.title.toLowerCase().includes(t) || v.channelTitle.toLowerCase().includes(t);
  });

  const isSelected = (video: Video) => selectedVideos.some(v => v.id === video.id);

  const handleVideoCardClick = (video: Video) => {
    if (isSelected(video)) onVideoDeselect(video);
    else onVideoSelect(video);
  };

  // counts for the button label
  const total = videos.length;
  const selected = selectedVideos.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-300 select-none">
          <input
            type="checkbox"
            className="h-4 w-4 accent-red-600"
            checked={showDelete}
            onChange={e => setShowDelete(e.target.checked)}
          />
          Delete videos
        </label>

        <h2 className="text-2xl font-bold text-white">
          Video Collection ({filteredVideos.length})
        </h2>

        <div className="flex items-center gap-2">
          {onToggleSelectAll && (
            <button
              type="button"
              onClick={onToggleSelectAll}
              className="px-3 py-2 rounded-md bg-gray-800 hover:bg-gray-700 border border-gray-600 text-sm"
              aria-pressed={!!allSelected}
              title={allSelected ? 'Deselect all videos' : 'Select all videos'}
            >
              {allSelected ? 'Deselect All' : 'Select All'} ({selected}/{total})
            </button>
          )}

          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search videos..."
              className="pl-8 pr-3 py-2 rounded-md bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 w-48 sm:w-64"
            />
          </div>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            title="Grid view"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            title="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 min-[420px]:grid-cols-3 min-[520px]:grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
          {filteredVideos.map(video => (
            <div key={video.id} className="relative">
              {isSelected(video) && (
                <div className="absolute inset-0 z-10 rounded-lg ring-2 ring-red-500 pointer-events-none" />
              )}
              <VideoCard
                video={video}
                onPlay={onVideoPlay}
                onAddToPlaylist={() => handleVideoCardClick(video)}
                onDelete={onVideoDelete}
                showDelete={showDelete}
                dense
              />
            </div>
          ))}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="space-y-2">
          {filteredVideos.map(video => (
            <div key={video.id} className="relative">
              {isSelected(video) && (
                <div className="absolute inset-y-0 left-0 w-1 bg-red-600 rounded-r" />
              )}
              <VideoCard
                video={video}
                onPlay={onVideoPlay}
                onAddToPlaylist={() => handleVideoCardClick(video)}
                onDelete={onVideoDelete}
                showDelete={showDelete}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
