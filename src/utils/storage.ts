import { Video, Playlist } from '../types';

const STORAGE_KEYS = {
  VIDEOS: 'youtube-manager-videos',
  PLAYLISTS: 'youtube-manager-playlists',
};

export const saveVideos = (videos: Video[]): void => {
  localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(videos));
};

export const loadVideos = (): Video[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.VIDEOS);
  return stored ? JSON.parse(stored) : [];
};

export const savePlaylists = (playlists: Playlist[]): void => {
  localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
};

export const loadPlaylists = (): Playlist[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.PLAYLISTS);
  return stored ? JSON.parse(stored) : [];
};