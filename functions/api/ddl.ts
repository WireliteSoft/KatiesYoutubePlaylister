// functions/api/ddl.ts
type Env = { DB?: D1Database };

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const headers = { 'content-type': 'application/json' };
  if (!env.DB) return new Response(JSON.stringify({ ok:false, error:'Missing DB binding' }), { status:500, headers });

  const db = env.DB;
  const ddls = [
    'CREATE TABLE IF NOT EXISTS videos (id TEXT PRIMARY KEY, title TEXT, thumbnail TEXT, duration TEXT, channelTitle TEXT, publishedAt TEXT)',
    'CREATE TABLE IF NOT EXISTS playlists (id TEXT PRIMARY KEY, name TEXT, description TEXT, createdAt TEXT, thumbnail TEXT)',
    'CREATE TABLE IF NOT EXISTS playlist_videos (playlist_id TEXT, video_id TEXT, position INTEGER, PRIMARY KEY (playlist_id, position))',
  ];

  const results: any[] = [];
  for (const sql of ddls) {
    try {
      await db.prepare(sql).run();
      results.push({ sql, ok: true });
    } catch (e: any) {
      results.push({ sql, ok: false, error: String(e?.message || e) });
    }
  }

  return new Response(JSON.stringify({ ok: true, results }, null, 2), { headers });
};
