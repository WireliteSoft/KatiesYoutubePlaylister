import React from 'react';
import { Play, Plus, Trash2 } from 'lucide-react';
import { Video } from '../types';

interface Props {
  video: Video;
  onPlay: (v: Video) => void;
  onAddToPlaylist: () => void;
  onDelete: (v: Video) => void;
  showDelete?: boolean;
  dense?: boolean;
}

export const VideoCard: React.FC<Props> = ({
  video,
  onPlay,
  onAddToPlaylist,
  onDelete,
  showDelete = false,
  dense = false,
}) => {
  const titleClass = dense ? 'text-xs line-clamp-2' : 'text-sm sm:text-base line-clamp-2';

  const meta =
    (video.channelTitle ? video.channelTitle : '') +
    (video.duration ? (video.channelTitle ? ` • ${video.duration}` : `${video.duration}`) : '');

  return (
    <div className="group bg-gray-800 rounded-xl overflow-hidden shadow-sm ring-1 ring-gray-700/50">
      {/* thumbnail */}
      <div className="relative w-full">
        <div className="relative w-full" style={{ paddingTop: dense ? '100%' : '56.25%' }}>
          {video.thumbnail && (
            <img
              src={video.thumbnail}
              alt={video.title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          )}
          <button
            type="button"
            onClick={() => onPlay(video)}
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40"
            aria-label="Play"
          >
            <Play className="w-8 h-8 text-white" />
          </button>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        <h3 className={`text-white font-semibold ${titleClass}`}>{video.title}</h3>

        {/* meta line — only render when something exists; no 'Unknown' */}
        {meta ? (
          <div className="mt-1 text-xs text-gray-400 leading-5 truncate">{meta}</div>
        ) : null}

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onAddToPlaylist}
            className="inline-flex items-center justify-center rounded-md bg-gray-700 hover:bg-gray-600 text-gray-100 px-2.5 py-1.5 text-xs sm:text-sm transition-colors"
            aria-label="Add to selection"
            title="Add to selection"
          >
            <Plus className="w-4 h-4" />
          </button>

          {showDelete && (
            <button
              type="button"
              onClick={() => onDelete(video)}
              className="inline-flex items-center justify-center rounded-md bg-red-600 hover:bg-red-700 text-white px-2.5 py-1.5 text-xs sm:text-sm transition-colors"
              aria-label="Delete"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
