import React, { useState } from 'react';
import { Plus, Loader2, Upload, FileText } from 'lucide-react';
import { isValidYouTubeUrl, extractVideoId, getVideoDetails, getVideoThumbnail } from '../utils/youtube';
import { Video } from '../types';

interface VideoInputProps {
  onVideoAdd: (video: Video) => void;
}

export const VideoInput: React.FC<VideoInputProps> = ({ onVideoAdd }) => {
  const [url, setUrl] = useState('');
  const [bulkUrls, setBulkUrls] = useState('');
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState('');
  const [bulkResults, setBulkResults] = useState<{ success: number; failed: number; duplicates: number }>({ success: 0, failed: 0, duplicates: 0 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!url.trim()) return;

    if (!isValidYouTubeUrl(url)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      setError('Could not extract video ID from URL');
      return;
    }

    setIsLoading(true);

    try {
      const videoDetails = await getVideoDetails(videoId);
      
      const video: Video = {
        id: videoId,
        url: url,
        title: videoDetails.title || `Video ${videoId}`,
        thumbnail: videoDetails.thumbnail || getVideoThumbnail(videoId),
        duration: videoDetails.duration || 'Unknown',
        channelTitle: videoDetails.channelTitle || 'Unknown Channel',
        publishedAt: videoDetails.publishedAt || new Date().toISOString().split('T')[0],
      };

      onVideoAdd(video);
      setUrl('');
    } catch (err) {
      setError('Failed to fetch video details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBulkResults({ success: 0, failed: 0, duplicates: 0 });

    if (!bulkUrls.trim()) return;

    // Extract URLs from the text (split by newlines, spaces, commas) — maintain input order
    const urls = bulkUrls
      .split(/[\n,\s]+/)
      .map(u => u.trim())
      .filter(u => u.length > 0);

    if (urls.length === 0) {
      setError('No valid URLs found');
      return;
    }

    // Build a quick lookup for existing IDs once (don’t rely on async state writes)
    const existingIds = new Set<string>(
      (() => {
        try {
          const arr = JSON.parse(localStorage.getItem('videos') || '[]');
          return Array.isArray(arr) ? arr.map((v: any) => v.id as string) : [];
        } catch {
          return [];
        }
      })()
    );
    const newlyAddedIds = new Set<string>(); // avoid dupes within this paste

    const validUrls = urls.filter(isValidYouTubeUrl);
    if (validUrls.length === 0) {
      setError('No valid YouTube URLs found');
      return;
    }

    setIsLoading(true);
    setBulkProgress({ current: 0, total: validUrls.length });

    let successCount = 0;
    let failedCount = 0;
    let duplicateCount = 0;

    // Process URLs in small batches; collect first, then add in order (preserves top→bottom)
    const batchSize = 3;
    for (let i = 0; i < validUrls.length; i += batchSize) {
      const batch = validUrls.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const videoId = extractVideoId(url);
          if (!videoId) throw new Error('invalid id');

          const videoDetails = await getVideoDetails(videoId);

          const video: Video = {
            id: videoId,
            url,
            title: videoDetails.title || `Video ${videoId}`,
            thumbnail: videoDetails.thumbnail || getVideoThumbnail(videoId),
            duration: videoDetails.duration || 'Unknown',
            channelTitle: videoDetails.channelTitle || 'Unknown Channel',
            publishedAt: videoDetails.publishedAt || new Date().toISOString().split('T')[0],
          };

          return video; // do NOT call onVideoAdd here
        })
      );

      // Add in the same order as input, with clear duplicate accounting
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) {
          const v = r.value as Video;
          if (existingIds.has(v.id) || newlyAddedIds.has(v.id)) {
            duplicateCount++;
          } else {
            onVideoAdd(v);
            newlyAddedIds.add(v.id);
            successCount++;
          }
        } else {
          failedCount++;
        }

        setBulkProgress((p) => ({
          current: Math.min(p.current + 1, validUrls.length),
          total: p.total,
        }));
      }

      // Small delay between batches to prevent rate limiting
      if (i + batchSize < validUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setBulkResults({ success: successCount, failed: failedCount, duplicates: duplicateCount });
    setIsLoading(false);
    
    if (successCount > 0) {
      setBulkUrls('');
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Add YouTube Videos</h2>
        <div className="flex bg-gray-700 rounded-lg overflow-hidden">
          <button type="button"
            onClick={() => setIsBulkMode(false)}
            className={`px-3 py-2 text-sm transition-colors ${
              !isBulkMode ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
          </button>
          <button type="button"
            onClick={() => setIsBulkMode(true)}
            className={`px-3 py-2 text-sm transition-colors ${
              isBulkMode ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isBulkMode ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste YouTube URL here..."
              className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-gray-400"
              disabled={isLoading}
            />
          </div>
          
          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            {isLoading ? 'Adding Video...' : 'Add Video'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleBulkSubmit} className="space-y-4">
          <div>
            <textarea
              value={bulkUrls}
              onChange={(e) => setBulkUrls(e.target.value)}
              placeholder="Paste multiple YouTube URLs here (one per line, or separated by commas/spaces)..."
              rows={8}
              className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-gray-400 resize-none"
              disabled={isLoading}
            />
          </div>
          
          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          {isLoading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-300">
                <span>Processing videos...</span>
                <span>{bulkProgress.current}/{bulkProgress.total}</span>
              </div>
              <div className="w-full bg-gray-600 rounded-full h-2">
                <div 
                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {bulkResults.success > 0 || bulkResults.failed > 0 || bulkResults.duplicates > 0 ? (
            <div className="bg-gray-700 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="text-white font-medium">Import Results</span>
              </div>
              <div className="space-y-1 text-gray-300">
                {bulkResults.success > 0 && (
                  <div className="text-green-400">✓ {bulkResults.success} videos added successfully</div>
                )}
                {bulkResults.duplicates > 0 && (
                  <div className="text-yellow-400">⚠ {bulkResults.duplicates} videos already in collection</div>
                )}
                {bulkResults.failed > 0 && (
                  <div className="text-red-400">✗ {bulkResults.failed} videos failed to import</div>
                )}
              </div>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isLoading || !bulkUrls.trim()}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
            {isLoading ? 'Importing Videos...' : 'Import Videos'}
          </button>
        </form>
      )}
    </div>
  );
};
