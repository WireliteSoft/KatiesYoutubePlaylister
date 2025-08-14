import React, { useState } from 'react';
import { Plus, Play, Trash2, Edit3 } from 'lucide-react';
import { Playlist, Video } from '../types';
import PlaylistEditor from './PlaylistEditor';

interface PlaylistManagerProps {
  playlists: Playlist[];
  videos: Video[];
  selectedVideos: Video[];
  onCreatePlaylist: (name: string, description: string, videos: Video[]) => void;
  onDeletePlaylist: (id: string) => void;
  onPlayPlaylist: (playlist: Playlist) => void;
  onClearSelection: () => void;
  onReorderPlaylist: (id: string, newOrder: Video[]) => void;
}

export const PlaylistManager: React.FC<PlaylistManagerProps> = ({
  playlists,
  videos,
  selectedVideos,
  onCreatePlaylist,
  onDeletePlaylist,
  onPlayPlaylist,
  onClearSelection,
  onReorderPlaylist,
}) => {
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDescription, setPlaylistDescription] = useState('');
  const [editing, setEditing] = useState<Playlist | null>(null);

  const handleCreate = () => {
    if (!playlistName.trim() || selectedVideos.length === 0) return;
    onCreatePlaylist(playlistName.trim(), playlistDescription.trim(), selectedVideos);
    setPlaylistName('');
    setPlaylistDescription('');
    onClearSelection();
    setTimeout(() => window.location.reload(), 5); // <-- ADD
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold text-white mb-4">Playlists</h2>

      {/* Create section */}
      <div className="space-y-3 mb-6">
        <input
          value={playlistName}
          onChange={(e) => setPlaylistName(e.target.value)}
          placeholder="Playlist name"
          className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg placeholder-gray-400 outline-none"
        />
        <textarea
          value={playlistDescription}
          onChange={(e) => setPlaylistDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg placeholder-gray-400 outline-none resize-none"
        />
        <button type="button"
          onClick={handleCreate}
          disabled={selectedVideos.length === 0 || !playlistName.trim()}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Create from {selectedVideos.length} selected
        </button>
        {selectedVideos.length > 0 && (
          <button type="button"
            onClick={onClearSelection}
            className="w-full text-sm text-gray-300 hover:text-white underline"
          >
            Clear selection
          </button>
        )}
      </div>

      {/* List */}
      <div className="space-y-4">
        {playlists.length === 0 ? (
          <div className="text-gray-400 text-sm">No playlists yet.</div>
        ) : (
          playlists.map((playlist) => (
            <div key={playlist.id} className="border border-gray-700 rounded-lg overflow-hidden">
              <div className="p-3 bg-gray-700/40 border-b border-gray-700 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-white font-medium truncate">{playlist.name}</div>
                  {playlist.description && (
                    <div className="text-gray-400 text-xs truncate">{playlist.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button type="button"
                    onClick={() => onPlayPlaylist(playlist)}
                    className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
                    title="Play"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button type="button"
                    onClick={() => setEditing(playlist)}
                    className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
                    title="Edit order"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button type="button"
                    onClick={() => onDeletePlaylist(playlist.id)}
                    className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Thumbnails preview */}
              {playlist.videos.length > 0 && (
                <div className="p-3 flex gap-2 overflow-x-auto">
                  {playlist.videos.slice(0, 5).map((v) => (
                    <img
                      key={v.id}
                      src={v.thumbnail}
                      alt=""
                      className="w-20 h-12 object-cover rounded"
                    />
                  ))}
                  {playlist.videos.length > 5 && (
                    <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center text-xs text-white">
                      +{playlist.videos.length - 5}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Editor modal */}
      {editing && (
        <PlaylistEditor
          playlist={editing}
          onClose={() => setEditing(null)}
          onSave={(newOrder) => {
            onReorderPlaylist(editing.id, newOrder);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
};
