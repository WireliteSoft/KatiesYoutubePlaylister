// src/components/PlaylistManager.tsx
import React from 'react';
import { ListPlus, Play, Pencil, Trash2 } from 'lucide-react';
import type { Playlist, Video } from '../types';
import PlaylistEditor from './PlaylistEditor';

type Props = {
  playlists: Playlist[];
  videos: Video[];
  selectedVideos: Video[];
  onCreatePlaylist: (name: string, description: string, videos: Video[]) => void;
  onDeletePlaylist: (id: string) => void;
  onPlayPlaylist: (p: Playlist) => void;
  onClearSelection: () => void;
  onReorderPlaylist: (id: string, newOrder: Video[]) => void;
};

export const PlaylistManager: React.FC<Props> = ({
  playlists,
  videos,
  selectedVideos,
  onCreatePlaylist,
  onDeletePlaylist,
  onPlayPlaylist,
  onClearSelection,
  onReorderPlaylist,
}) => {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [editing, setEditing] = React.useState<Playlist | null>(null);
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);

  const canCreate = selectedVideos.length > 0 && name.trim().length > 0;

  const handleCreate = () => {
    if (!canCreate) return;
    onCreatePlaylist(name.trim(), description.trim(), selectedVideos);
    setName('');
    setDescription('');
    onClearSelection();
  };

  const openEditor = (p: Playlist) => {
    setEditing(p);
    setIsEditorOpen(true);
  };
  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditing(null);
  };
  const saveEditor = (id: string, newOrder: Video[]) => {
    onReorderPlaylist(id, newOrder);
    closeEditor();
  };

  return (
    <div className="space-y-6">
      {/* Create playlist */}
      <div className="rounded-xl bg-gray-800 border border-gray-700 p-4">
        <h3 className="text-white font-semibold mb-3">New Playlist</h3>
        <div className="space-y-2">
          <input
            className="w-full rounded-md bg-gray-700 text-gray-100 px-3 py-2 outline-none focus:ring-2 focus:ring-red-600"
            placeholder="Playlist name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full rounded-md bg-gray-700 text-gray-100 px-3 py-2 outline-none focus:ring-2 focus:ring-red-600"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button
            type="button"
            disabled={!canCreate}
            onClick={handleCreate}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 ${
              canCreate
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-600 text-gray-300 cursor-not-allowed'
            }`}
          >
            <ListPlus className="w-4 h-4" />
            Create from {selectedVideos.length} selected
          </button>
        </div>
      </div>

      {/* Playlists */}
      <div className="rounded-xl bg-gray-800 border border-gray-700">
        <div className="px-4 py-3 border-b border-gray-700">
          <h3 className="text-white font-semibold">Playlists ({playlists.length})</h3>
        </div>

        <ul className="divide-y divide-gray-700">
          {playlists.map((p) => (
            <li key={p.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                {/* Thumb */}
                <div className="w-16 h-10 rounded overflow-hidden bg-gray-700 shrink-0">
                  {p.thumbnail ? (
                    <img src={p.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </div>

                {/* LEFT: title/desc/preview — this is the ONLY clickable area to play */}
                <div
                  className="min-w-0 flex-1 cursor-pointer"
                  onClick={() => onPlayPlaylist(p)}
                >
                  <div className="text-white font-medium truncate">{p.name}</div>
                  {p.description ? (
                    <div className="text-xs text-gray-400 truncate">{p.description}</div>
                  ) : null}

                  {/* tiny preview strip (first few videos) */}
                  {Array.isArray(p.videos) && p.videos.length > 0 && (
                    <div className="mt-2 flex items-center gap-2 overflow-x-auto">
                      {p.videos.slice(0, 6).map((v) => (
                        <img
                          key={v.id}
                          src={v.thumbnail}
                          alt=""
                          className="w-12 h-7 rounded object-cover bg-gray-700"
                          loading="lazy"
                          decoding="async"
                        />
                      ))}
                      {p.videos.length > 6 && (
                        <span className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-200">
                          +{p.videos.length - 6}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* RIGHT: actions — use capture-phase stoppers so row can't steal the click */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onMouseDownCapture={(e) => e.stopPropagation()}
                    onTouchStartCapture={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayPlaylist(p);
                    }}
                    className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-100"
                    title="Play"
                    aria-label="Play"
                  >
                    <Play className="w-4 h-4 pointer-events-none" />
                  </button>

                  <button
                    type="button"
                    onMouseDownCapture={(e) => e.stopPropagation()}
                    onTouchStartCapture={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditor(p);
                    }}
                    className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-100"
                    title="Edit order"
                    aria-label="Edit"
                  >
                    <Pencil className="w-4 h-4 pointer-events-none" />
                  </button>

                  <button
                    type="button"
                    onMouseDownCapture={(e) => e.stopPropagation()}
                    onTouchStartCapture={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePlaylist(p.id);
                    }}
                    className="p-2 rounded-md bg-red-600 hover:bg-red-700 text-white"
                    title="Delete playlist"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4 pointer-events-none" />
                  </button>
                </div>
              </div>
            </li>
          ))}

          {playlists.length === 0 && (
            <li className="px-4 py-6 text-sm text-gray-400">No playlists yet.</li>
          )}
        </ul>
      </div>

      {/* Editor modal */}
      {editing && (
        <PlaylistEditor
          isOpen={isEditorOpen}
          playlist={editing}
          onClose={closeEditor}
          onSave={saveEditor}
        />
      )}
    </div>
  );
};
