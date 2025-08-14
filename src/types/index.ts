export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  channelTitle: string;
  publishedAt: string;
  url: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  videos: Video[];
  createdAt: string;
  thumbnail?: string;
}

export interface AppState {
  videos: Video[];
  playlists: Playlist[];
  currentPlaylist: Playlist | null;
  currentVideo: Video | null;
  isPlayerOpen: boolean;
}