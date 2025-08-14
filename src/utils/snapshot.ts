import type { Video, Playlist } from '../types';

export type BackupPayload = {
  version: number;
  updatedAt: string;
  videos: Video[];
  playlists: Playlist[];
};

// The function above deploys at this path:
const REMOTE_URL = '/api/library';

// ---- Remote (D1 via Pages Function) ----
export async function loadRemote(): Promise<BackupPayload | null> {
  try {
    const r = await fetch(REMOTE_URL, { method: 'GET', headers: { accept: 'application/json' } });
    if (!r.ok) return null;
    return (await r.json()) as BackupPayload;
  } catch {
    return null;
  }
}

export async function saveRemote(videos: Video[], playlists: Playlist[]) {
  try {
    await fetch(REMOTE_URL, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ version: 1, videos, playlists }),
    });
  } catch {}
}

// ---- Local mirror (safety) ----
const MIRROR_KEY = '__yt_collection_backup__';

export function mirrorToLocalStorage(videos: Video[], playlists: Playlist[]) {
  try {
    localStorage.setItem(
      MIRROR_KEY,
      JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), videos, playlists })
    );
  } catch {}
}

export function readMirrorFromLocalStorage(): BackupPayload | null {
  try {
    const raw = localStorage.getItem(MIRROR_KEY);
    return raw ? (JSON.parse(raw) as BackupPayload) : null;
  } catch {
    return null;
  }
}

// Not used when you have D1
export async function requestPersistentStorage() { return false as const; }
export async function saveSnapshotOPFS(_: Video[], __: Playlist[]) { return false as const; }
