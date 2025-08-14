// src/components/PlaylistEditor.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { X, GripVertical, Trash2, Play } from 'lucide-react';
import type { Playlist, Video } from '../types';

type Props = {
  playlist: Playlist;
  isOpen: boolean;
  onClose: () => void;
  // parent persists: onReorderPlaylist(id, newOrder)
  onSave: (id: string, newOrder: Video[]) => void;
  onPlayPreview?: (v: Video) => void;
};

function reorder<T>(list: T[], startIndex: number, endIndex: number): T[] {
  const next = list.slice();
  const [moved] = next.splice(startIndex, 1);
  next.splice(endIndex, 0, moved);
  return next;
}

export default function PlaylistEditor({
  playlist,
  isOpen,
  onClose,
  onSave,
  onPlayPreview,
}: Props) {
  const [items, setItems] = useState<Video[]>(playlist.videos ?? []);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // keep local when a different playlist opens
  useEffect(() => {
    setItems(playlist.videos ?? []);
    setDragIndex(null);
    setOverIndex(null);
  }, [playlist.id]);

  const handleDragStart = useCallback(
    (index: number) => (e: React.DragEvent) => {
      setDragIndex(index);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    },
    []
  );

  const handleDragOver = useCallback(
    (index: number) => (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setOverIndex(index);
    },
    []
  );

  const handleDrop = useCallback(
    (index: number) => (e: React.DragEvent) => {
      e.preventDefault();
      const src =
        parseInt(e.dataTransfer.getData('text/plain') || '', 10) ?? dragIndex;
      if (src == null || src === index) {
        setDragIndex(null);
        setOverIndex(null);
        return;
      }
      setItems(prev => reorder(prev, src as number, index));
      setDragIndex(null);
      setOverIndex(null);
    },
    [dragIndex]
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  // NEW: delete a song from this playlist (local until Save)
  const handleRemove = useCallback((id: string) => {
    setItems(prev => prev.filter(v => v.id !== id));
  }, []);

  const handleSave = useCallback(() => {
    onSave(playlist.id, items);
    onClose();
  }, [onSave, onClose, playlist.id, items]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-3xl rounded-2xl bg-gray-900 ring-1 ring-gray-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div>
            <h3 className="text-white font-semibold">Edit Order — {playlist.name}</h3>
            <p className="text-xs text-gray-400">Drag to reorder. Use the X to remove. Click Save to apply.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md bg-gray-800 hover:bg-gray-700 text-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[65vh] overflow-y-auto p-3 space-y-2">
          {items.map((v, idx) => (
            <div
              key={v.id}
              draggable
              onDragStart={handleDragStart(idx)}
              onDragOver={handleDragOver(idx)}
              onDrop={handleDrop(idx)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 p-2 rounded-xl border
                ${overIndex === idx ? 'bg-gray-800 border-gray-600' : 'bg-gray-800/70 border-gray-700'}
              `}
            >
              {/* drag handle */}
              <div className="p-2 text-gray-400 cursor-grab active:cursor-grabbing">
                <GripVertical className="w-5 h-5" />
              </div>

              {/* thumb */}
              <div className="relative w-20 h-12 overflow-hidden rounded-md bg-gray-700">
                {v.thumbnail && (
                  <img
                    src={v.thumbnail}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                )}
                {onPlayPreview && (
                  <button
                    type="button"
                    onClick={() => onPlayPreview(v)}
                    className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white"
                  >
                    <Play className="w-3 h-3 inline mr-1" /> Play
                  </button>
                )}
              </div>

              {/* text */}
              <div className="min-w-0 flex-1">
                <div className="text-white text-sm font-medium truncate">{v.title}</div>
                <div className="text-gray-400 text-xs truncate">
                  {v.channelTitle || 'Unknown'} {v.duration ? `• ${v.duration}` : ''}
                </div>
              </div>

              {/* NEW delete button (right side) */}
              <button
                type="button"
                onClick={() => handleRemove(v.id)}
                className="ml-2 px-2.5 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white"
                title="Remove from this playlist"
                aria-label="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="w-10 text-right text-gray-500 text-xs">#{idx + 1}</div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="text-center text-sm text-gray-400 py-10 border border-dashed border-gray-700 rounded-lg">
              No videos in this playlist.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-800 hover:bg-gray-700 text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold"
          >
            Save Order
          </button>
        </div>
      </div>
    </div>
  );
}
