// src/components/PlaylistEditor.tsx
import React from 'react';
import { X, Save, GripVertical, Trash2, Play } from 'lucide-react';
import type { Playlist, Video } from '../types';

// dnd-kit (already in your project if you were using drag & drop)
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Props = {
  playlist: Playlist;
  isOpen: boolean;
  onClose: () => void;
  // Save callback used by your parent/manager:
  // persists the new order (and now deletions) for this playlist.
  onSave: (id: string, newOrder: Video[]) => void;
  // Optional: quick play preview (safe to ignore if you don't use it)
  onPlayPreview?: (v: Video) => void;
};

export default function PlaylistEditor({
  playlist,
  isOpen,
  onClose,
  onSave,
  onPlayPreview,
}: Props) {
  const [items, setItems] = React.useState<Video[]>(playlist.videos || []);

  // Keep local list in sync if a different playlist opens
  React.useEffect(() => {
    setItems(playlist.videos || []);
  }, [playlist.id]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex(v => v.id === active.id);
    const newIndex = items.findIndex(v => v.id === over.id);
    setItems(prev => arrayMove(prev, oldIndex, newIndex));
  };

  // NEW: remove a single video from this playlist (local, until Save)
  const handleRemove = (id: string) => {
    setItems(prev => prev.filter(v => v.id !== id));
  };

  const handleSave = () => {
    onSave(playlist.id, items);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-2xl rounded-2xl bg-gray-900 ring-1 ring-gray-800 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Edit playlist: <span className="text-red-400">{playlist.name}</span>
            </h3>
            <p className="text-xs text-gray-400">
              Drag to reorder. Use the trash to remove. Click Save to apply.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-300 hover:bg-gray-800 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body: draggable list */}
        <div className="max-h-[60vh] overflow-y-auto p-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map(v => v.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {items.map(video => (
                  <SortableRow
                    key={video.id}
                    video={video}
                    onRemove={handleRemove}
                    onPlayPreview={onPlayPreview}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          {items.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-700 p-6 text-center text-sm text-gray-400">
              No videos in this playlist. Add some from the collection, or Cancel.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-800 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-gray-800 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            <Save className="h-4 w-4" />
            Save order
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Sortable Row (one video) ---------- */

function SortableRow({
  video,
  onRemove,
  onPlayPreview,
}: {
  video: Video;
  onRemove: (id: string) => void;
  onPlayPreview?: (v: Video) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: video.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-850/60 p-2 ${
        isDragging ? 'opacity-80 ring-2 ring-red-500' : ''
      }`}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex cursor-grab items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-800 hover:text-gray-200 active:cursor-grabbing"
        aria-label="Drag to reorder"
        title="Drag"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* Thumb */}
      <div className="relative h-14 w-24 overflow-hidden rounded-md bg-gray-700">
        {video.thumbnail && (
          <img
            src={video.thumbnail}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        )}
        {onPlayPreview && (
          <button
            type="button"
            onClick={() => onPlayPreview(video)}
            className="absolute bottom-1 right-1 rounded-md bg-black/60 p-1 text-white hover:bg-black/70"
            title="Preview"
          >
            <Play className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-white">{video.title}</div>
        <div className="truncate text-xs text-gray-400">
          {video.channelTitle || 'Unknown'} {video.duration ? `• ${video.duration}` : ''}
        </div>
      </div>

      {/* NEW: Delete from playlist (local until Save) */}
      <button
        type="button"
        onClick={() => onRemove(video.id)}
        className="inline-flex items-center justify-center rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700"
        title="Remove from this playlist"
        aria-label="Remove"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}
