import type { Video } from '../types';

/** Basic validation for YouTube links */
export const isValidYouTubeUrl = (url: string): boolean => {
  try {
    const u = new URL(url);
    return /(^|\.)youtube\.com$/.test(u.hostname) || /(^|\.)youtu\.be$/.test(u.hostname);
  } catch {
    return false;
  }
};

/** Grab a YouTube video ID from multiple URL shapes, including Shorts */
export const extractVideoId = (url: string): string | null => {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/watch\?v=([^&\n?#]+)/,
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/embed\/([^&\n?#]+)/,
    /(?:https?:\/\/)?(?:www\.)?(?:youtu\.be)\/([^&\n?#]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([^&\n?#]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  try {
    const u = new URL(url);
    const id = u.searchParams.get('v');
    if (id) return id;
  } catch {}
  return null;
};

/** Thumbnail helper */
export const getVideoThumbnail = (videoId: string) =>
  `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;

/**
 * Fetch real metadata without an API key.
 * Strategy:
 *  1) noembed.com (CORS-friendly)
 *  2) youtube-nocookie oEmbed (may work, depends on browser/CORS)
 *  3) fallback to placeholders
 */
export const getVideoDetails = async (videoId: string): Promise<Partial<Video>> => {
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;

  // 1) noembed.com (usually CORS-OK)
  try {
    const r = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(watchUrl)}`);
    if (r.ok) {
      const data = await r.json();
      return {
        title: (data.title as string) ?? `Video ${videoId}`,
        thumbnail: (data.thumbnail_url as string) ?? getVideoThumbnail(videoId),
        duration: 'Unknown',
        channelTitle: (data.author_name as string) ?? 'Unknown Channel',
        publishedAt: new Date().toISOString().split('T')[0],
      };
    }
  } catch { /* ignore */ }

  // 2) YouTube oEmbed (nocookie)
  try {
    const r2 = await fetch(`https://www.youtube-nocookie.com/oembed?format=json&url=${encodeURIComponent(watchUrl)}`);
    if (r2.ok) {
      const data2 = await r2.json();
      return {
        title: (data2.title as string) ?? `Video ${videoId}`,
        thumbnail: (data2.thumbnail_url as string) ?? getVideoThumbnail(videoId),
        duration: 'Unknown',
        channelTitle: (data2.author_name as string) ?? 'Unknown Channel',
        publishedAt: new Date().toISOString().split('T')[0],
      };
    }
  } catch { /* ignore */ }

  // 3) Fallback
  return {
    title: `Video ${videoId}`,
    thumbnail: getVideoThumbnail(videoId),
    duration: 'Unknown',
    channelTitle: 'Unknown Channel',
    publishedAt: new Date().toISOString().split('T')[0],
  };
};
