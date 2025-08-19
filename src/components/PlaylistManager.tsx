// src/components/PlaylistManager.tsx
import React from 'react';
import { PlusCircle, Trash2, Play } from 'lucide-react';
import type { Video, Playlist } from '../types';

interface PlaylistManagerProps {
  playlists: Playlist[];
  videos: Video[];
  selectedVideos: Video[];

  onCreatePlaylist: (name: string, description: string, vids: Video[]) => void;
  onDeletePlaylist: (playlistId: string) => void;
  onPlayPlaylist: (playlist: Playlist) => void;
  onClearSelection: () => void;

  // Currently unused here, but kept for API parity with App
  onReorderPlaylist: (playlistId: string, newOrder: Video[]) => void;

  // NEW: append current selection to an existing playlist
  onAddSelectedToPlaylist: (playlistId: string) => void;
}

export const PlaylistManager: React.FC<PlaylistManagerProps> = ({
  playlists,
  videos,
  selectedVideos,
  onCreatePlaylist,
  onDeletePlaylist,
  onPlayPlaylist,
  onClearSelection,
  onReorderPlaylist, // eslint-disable-line @typescript-eslint/no-unused-vars
  onAddSelectedToPlaylist,
}) => {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [targetPlaylistId, setTargetPlaylistId] = React.useState('');

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreatePlaylist(trimmed, description.trim(), selectedVideos);
    setName('');
    setDescription('');
    onClearSelection();
  };

  const selectedCount = selectedVideos.length;

  // Show *older* playlists first without relying on createdAt/updatedAt.
  // Your state pushes new playlists to the front; reversing gives oldest-first.
  const sortedOldestFirst = React.useMemo(
    () => playlists.slice().reverse(),
    [playlists]
  );

  return (
    <div className="space-y-6">
      {/* Create Playlist from Selection */}
      <div className="p-4 rounded-lg bg-gray-800 border border-gray-700">
        <div className="mb-3 text-sm text-gray-300">
          Create a new playlist from <span className="font-semibold">{selectedCount}</span>{' '}
          selected video{selectedCount === 1 ? '' : 's'}.
        </div>

        <div className="grid grid-cols-1 gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder="Playlist name"
            className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-400"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            placeholder="Description (optional)"
            className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-400 min-h-[72px]"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={!selectedCount || !name.trim()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white text-sm disabled:opacity-50"
              title="Create playlist from current selection"
            >
              <PlusCircle className="w-4 h-4" />
              Create Playlist
            </button>

            <button
              type="button"
              onClick={onClearSelection}
              disabled={!selectedCount}
              className="px-3 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white text-sm disabled:opacity-50"
              title="Clear current selection"
            >
              Clear Selection
            </button>
          </div>
        </div>
      </div>

      {/* Add Selection to Existing Playlist (Oldest first) */}
      <div className="p-4 rounded-lg bg-gray-800 border border-gray-700">
        <div className="mb-3 text-sm text-gray-300">
          Add <span className="font-semibold">{selectedCount}</span> selected video
          {selectedCount === 1 ? '' : 's'} to an existing playlist (oldest first):
        </div>
        <div className="flex items-center gap-2">
          <select
            className="flex-1 bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100"
            value={targetPlaylistId}
            onChange={(e) => setTargetPlaylistId(e.currentTarget.value)}
          >
            <option value="" disabled>
              Select a playlist…
            </option>
            {sortedOldestFirst.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.videos.length})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => targetPlaylistId && onAddSelectedToPlaylist(targetPlaylistId)}
            disabled={!selectedCount || !targetPlaylistId}
            className="px-3 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white text-sm disabled:opacity-50"
            title="Append selected videos to the chosen playlist"
          >
            Add to Playlist
          </button>
        </div>
      </div>

      {/* Existing Playlists */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-300">Playlists</h3>
        {playlists.length === 0 ? (
          <div className="text-sm text-gray-400">No playlists yet.</div>
        ) : (
          <ul className="space-y-2">
            {playlists.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-white font-medium truncate">{p.name}</div>
                  <div className="text-xs text-gray-400">
                    {p.videos.length} video{p.videos.length === 1 ? '' : 's'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onPlayPlaylist(p)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-white text-xs"
                    title="Play this playlist"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Play
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeletePlaylist(p.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs"
                    title="Delete this playlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
