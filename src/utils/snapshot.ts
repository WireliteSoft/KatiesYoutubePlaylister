// src/utils/snapshot.ts
import type { Video, Playlist } from '../types';

export type BackupPayload = {
  version: number;
  exportedAt: string;
  videos: Video[];
  playlists: Playlist[];
};

const FILENAME = 'youtube-collection-backup.json';

function makePayload(videos: Video[], playlists: Playlist[]): BackupPayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    videos,
    playlists,
  };
}

// Try to get Origin Private File System directory (Chromium).
// We type as any to avoid TS lib friction.
async function getOPFSRoot(): Promise<any | null> {
  try {
    const nav: any = navigator as any;
    if (!nav?.storage?.getDirectory) return null;
    const root = await nav.storage.getDirectory();
    return root;
  } catch {
    return null;
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      // @ts-ignore
      return await navigator.storage.persist();
    }
  } catch {}
  return false;
}

export async function saveSnapshotOPFS(videos: Video[], playlists: Playlist[]): Promise<boolean> {
  const root = await getOPFSRoot();
  if (!root) return false;
  try {
    const fileHandle = await root.getFileHandle(FILENAME, { create: true });
    const writable = await fileHandle.createWritable();
    const data = JSON.stringify(makePayload(videos, playlists));
    await writable.write(data);
    await writable.close();
    return true;
  } catch (e) {
    console.error('[snapshot] save OPFS failed:', e);
    return false;
  }
}

export async function loadSnapshotOPFS(): Promise<BackupPayload | null> {
  const root = await getOPFSRoot();
  if (!root) return null;
  try {
    const fileHandle = await root.getFileHandle(FILENAME, { create: false });
    const file = await fileHandle.getFile();
    const text = await file.text();
    const data = JSON.parse(text);
    if (!Array.isArray(data?.videos) || !Array.isArray(data?.playlists)) return null;
    return data as BackupPayload;
  } catch {
    return null;
  }
}

// Fallback to localStorage mirror (still same origin, but a second copy).
const MIRROR_KEY = '__yt_collection_backup__';

export function mirrorToLocalStorage(videos: Video[], playlists: Playlist[]): void {
  try {
    const data = makePayload(videos, playlists);
    localStorage.setItem(MIRROR_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[snapshot] mirror LS failed:', e);
  }
}

export function readMirrorFromLocalStorage(): BackupPayload | null {
  try {
    const raw = localStorage.getItem(MIRROR_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!Array.isArray(data?.videos) || !Array.isArray(data?.playlists)) return null;
    return data as BackupPayload;
  } catch {
    return null;
  }
}
