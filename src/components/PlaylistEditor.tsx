import React, { useState, useCallback } from 'react';
import { X, GripVertical, Trash2 } from 'lucide-react';
import { savePlaylistMapping } from '../utils/snapshot';
import type { Playlist, Video } from '../types';

interface PlaylistEditorProps {
  playlist: Playlist;
  onClose: () => void;
  onSave?: (newOrder: Video[]) => void; // optional; we’ll default to no-op
}

function reorder<T>(list: T[], startIndex: number, endIndex: number): T[] {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

export default function PlaylistEditor(props: PlaylistEditorProps) {
  const { playlist, onClose } = props;
  const onSave = props.onSave ?? (() => {}); // <- guarantees it's defined

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
    // persist to DB first so refresh reflects it
    savePlaylistMapping(playlist.id, items.map(v => v.id)).catch(() => {});
    onSave(items); //
