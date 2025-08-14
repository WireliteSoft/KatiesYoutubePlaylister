import React from 'react';
import { Play, Plus, Trash2 } from 'lucide-react';
import { Video } from '../types';

interface VideoCardProps {
  video: Video;
  onPlay: (video: Video) => void;
  onAddToPlaylist: (video: Video) => void;
  onDelete: (video: Video) => void;
  showDelete?: boolean;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  onPlay,
  onAddToPlaylist,
  onDelete,
  showDelete = false,
}) => {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="relative group">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-48 object-cover"
          loading="lazy"
        />
        {/* Hover overlay with Play button */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onPlay(video); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-red-600 hover:bg-red-700 text-white p-3 rounded-full"
            title="Play"
          >
            <Play className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-white font-semibold line-clamp-2">{video.title}</h3>
        <p className="text-gray-400 text-sm mt-1 line-clamp-1">{video.channelTitle}</p>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-gray-300 text-sm">{video.duration}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAddToPlaylist(video); }}
              className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors"
              title="Add to playlist"
            >
              <Plus className="w-4 h-4" />
            </button>

            {showDelete && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(video); }}
                className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors"
                title="Delete video"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
