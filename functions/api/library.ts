// /functions/api/library.ts
// Shared playlists/videos API backed by Cloudflare D1.
// GET  /api/library  -> { videos, playlists }
// PUT  /api/library  -> replace with posted { videos, playlists }

type Env = { DB: D1Database };

const headers = {
  'content-type': 'application/json',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,PUT,OPTIONS',
};

async function ensureSchema(db: D1Database) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      title TEXT,
      thumbnail TEXT,
      duration TEXT,
      channelTitle TEXT,
      publishedAt TEXT
    );
    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      createdAt TEXT,
      thumbnail TEXT
    );
    CREATE TABLE IF NOT EXISTS playlist_videos (
      playlist_id TEXT,
      video_id TEXT,
      position INTEGER,
      PRIMARY KEY (playlist_id, position)
    );
  `);
}

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, { headers });

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const db = env.DB;
  await ensureSchema(db);

  const vids = await db
    .prepare(`SELECT id, title, thumbnail, duration, channelTitle, publishedAt FROM videos`)
    .all();

  const pls = await db
    .prepare(`SELECT id, name, description, createdAt, thumbnail FROM playlists`)
    .all();

  const out: any[] = [];
  for (const p of (pls.results as any[]) ?? []) {
    const pv = await db
      .prepare(
        `SELECT pv.video_id, pv.position, v.title, v.thumbnail, v.duration, v.channelTitle, v.publishedAt
         FROM playlist_videos pv JOIN videos v ON v.id = pv.video_id
         WHERE pv.playlist_id = ? ORDER BY pv.position ASC`
      )
      .bind(p.id)
      .all();

    out.push({
      ...p,
      videos: ((pv.results as any[]) ?? []).map(r => ({
        id: r.video_id,
        title: r.title,
        thumbnail: r.thumbnail,
        duration: r.duration,
        channelTitle: r.channelTitle,
        publishedAt: r.publishedAt,
      })),
    });
  }

  return new Response(
    JSON.stringify({
      version: 1,
      updatedAt: new Date().toISOString(),
      videos: vids.results ?? [],
      playlists: out,
    }),
    { headers }
  );
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const db = env.DB;
  await ensureSchema(db);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Bad JSON' }), { status: 400, headers });
  }
  if (!Array.isArray(body?.videos) || !Array.isArray(body?.playlists)) {
    return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400, headers });
  }

  // wipe & write
  await db.exec(`DELETE FROM playlist_videos; DELETE FROM playlists; DELETE FROM videos;`);

  for (const v of body.videos) {
    if (!v?.id) continue;
    await db
      .prepare(
        `INSERT INTO videos (id, title, thumbnail, duration, channelTitle, publishedAt)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        v.id,
        v.title ?? '',
        v.thumbnail ?? '',
        v.duration ?? '',
        v.channelTitle ?? '',
        v.publishedAt ?? ''
      )
      .run();
  }

  for (const p of body.playlists) {
    if (!p?.id) continue;
    await db
      .prepare(
        `INSERT INTO playlists (id, name, description, createdAt, thumbnail)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(p.id, p.name ?? '', p.description ?? '', p.createdAt ?? '', p.thumbnail ?? '')
      .run();

    if (Array.isArray(p.videos)) {
      let pos = 0;
      for (const vv of p.videos) {
        const vid = typeof vv === 'string' ? vv : vv?.id;
        if (!vid) continue;
        await db
          .prepare(
            `INSERT INTO playlist_videos (playlist_id, video_id, position)
             VALUES (?, ?, ?)`
          )
          .bind(p.id, vid, pos++)
          .run();
      }
    }
  }

  return new Response(
    JSON.stringify({ ok: true, updatedAt: new Date().toISOString() }),
    { headers }
  );
};
