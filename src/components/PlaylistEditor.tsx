import React, { useState, useCallback } from 'react';
import { X, GripVertical, Trash2 } from 'lucide-react';
import { savePlaylistMapping } from '../utils/snapshot';
import type { Playlist, Video } from '../types';

interface PlaylistEditorProps {
  playlist: Playlist;
  onClose: () => void;
  onSave: (newOrder: Video[]) => void;
}

function reorder<T>(list: T[], startIndex: number, endIndex: number): T[] {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

export default function PlaylistEditor(props: PlaylistEditorProps) {
  const { playlist, onClose, onSave } = props;

  const [items, setItems] = useState<Video[]>(playlist.videos ?? []);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

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
      const srcStr = e.dataTransfer.getData('text/plain');
      const src = srcStr ? parseInt(srcStr, 10) : dragIndex;
      if (src == null || src === index) {
        setDragIndex(null);
        setOverIndex(null);
        return;
      }
      setItems(prev => reorder(prev, src, index));
      setDragIndex(null);
      setOverIndex(null);
    },
    [dragIndex]
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  const saveOrder = useCallback(() => {
    onSave(items);
  }, [items, onSave]);

  const handleRemove = useCallback(
    (videoId: string) => {
      setItems(prev => {
        const next = prev.filter(v => v.id !== videoId);

        // 1) Persist to DB immediately (replaces this playlist’s mapping)
        savePlaylistMapping(playlist.id, next.map(v => v.id)).catch(() => {});

        // 2) Update parent state (keeps UI + player in sync)
        onSave(next);

        return next;
      });
    },
    [onSave, playlist.id]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="text-white font-semibold truncate pr-4">
            Edit Order — {playlist.name}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
          {items.map((v, idx) => (
            <div
              key={v.id}
              draggable
              onDragStart={handleDragStart(idx)}
              onDragOver={handleDragOver(idx)}
              onDrop={handleDrop(idx)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 p-2 rounded-lg border ${
                overIndex === idx ? 'bg-gray-800 border-gray-600' : 'bg-gray-800/60 border-gray-700'
              }`}
            >
              <GripVertical className="w-5 h-5 text-gray-400 shrink-0" />
              <img src={v.thumbnail} alt="" className="w-16 h-9 rounded object-cover shrink-0" />
              <div className="min-w-0">
                <div className="text-white text-sm truncate">{v.title}</div>
                <div className="text-gray-400 text-xs truncate">{v.channelTitle}</div>
              </div>

              <div className="ml-auto text-gray-400 text-xs">{v.duration}</div>

              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemove(v.id); }}
                className="ml-3 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
                aria-label="Remove from this playlist"
                title="Remove from this playlist"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="ml-2 text-gray-500 text-xs w-10 text-right">#{idx + 1}</div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="text-gray-400 text-sm text-center py-8">This playlist is empty.</div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveOrder}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            Save Order
          </button>
        </div>
      </div>
    </div>
  );
}
