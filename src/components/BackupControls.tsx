import React, { useRef } from 'react';

function downloadBlob(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function BackupControls() {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    try {
      const videos = JSON.parse(localStorage.getItem('videos') || '[]');
      const playlists = JSON.parse(localStorage.getItem('playlists') || '[]');
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        videos,
        playlists,
      };
      downloadBlob('youtube-collection-backup.json', JSON.stringify(payload, null, 2));
    } catch (e) {
      console.error(e);
      alert('Failed to export. See console for details.');
    }
  };

  const handleImportClick = () => fileRef.current?.click();

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data?.videos) || !Array.isArray(data?.playlists)) {
        alert('Invalid backup file.');
        return;
      }
      if (!confirm('Importing will overwrite your current videos and playlists. Continue?')) return;
      localStorage.setItem('videos', JSON.stringify(data.videos));
      localStorage.setItem('playlists', JSON.stringify(data.playlists));
      setTimeout(() => window.location.reload(), 50);
    } catch (e) {
      console.error(e);
      alert('Failed to import. See console for details.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleExport}
        className="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm"
        title="Export videos & playlists"
      >
        Export
      </button>
      <button
        type="button"
        onClick={handleImportClick}
        className="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm"
        title="Import from a backup file"
      >
        Import
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImport}
      />
    </div>
  );
}
