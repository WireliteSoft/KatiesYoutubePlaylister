// /functions/api/library.ts
// GET  /api/library  -> { videos, playlists }
// PUT  /api/library  -> replace entire library { videos, playlists }

type Env = { DB?: D1Database };

const headers = {
  'content-type': 'application/json',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,PUT,OPTIONS',
};

const j = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

async function ensureSchema(db: D1Database) {
  // Run statements one-by-one (some setups choke on multi-stmt .exec)
  await db.exec(`CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    title TEXT,
    thumbnail TEXT,
    duration TEXT,
    channelTitle TEXT,
    publishedAt TEXT
  );`);
  await db.exec(`CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    createdAt TEXT,
    thumbnail TEXT
  );`);
  await db.exec(`CREATE TABLE IF NOT EXISTS playlist_videos (
    playlist_id TEXT,
    video_id TEXT,
    position INTEGER,
    PRIMARY KEY (playlist_id, position)
  );`);
}

export const onRequestOptions: PagesFunction<Env> = async () => new Response(null, { headers });

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    if (!env.DB) return j({ error: 'Missing D1 binding "DB"' }, 500);
    const db = env.DB;

    await ensureSchema(db);

    const vids = await db
      .prepare(`SELECT id, title, thumbnail, duration, channelTitle, publishedAt FROM videos`)
      .all();

    const pls = await db
      .prepare(`SELECT id, name, description, createdAt, thumbnail FROM playlists`)
      .all();

    const playlists: any[] = [];
    for (const p of (pls.results as any[]) ?? []) {
      const pv = await db
        .prepare(
          `SELECT pv.video_id, pv.position, v.title, v.thumbnail, v.duration, v.channelTitle, v.publishedAt
           FROM playlist_videos pv JOIN videos v ON v.id = pv.video_id
           WHERE pv.playlist_id = ? ORDER BY pv.position ASC`
        )
        .bind(p.id)
        .all();

      playlists.push({
        ...p,
        videos: ((pv.results as any[]) ?? []).map((r) => ({
          id: r.video_id,
          title: r.title,
          thumbnail: r.thumbnail,
          duration: r.duration,
          channelTitle: r.channelTitle,
          publishedAt: r.publishedAt,
        })),
      });
    }

    return j({
      version: 1,
      updatedAt: new Date().toISOString(),
      videos: vids.results ?? [],
      playlists,
    });
  } catch (e: any) {
    return j({ error: String(e?.message || e) }, 500);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  try {
    if (!env.DB) return j({ error: 'Missing D1 binding "DB"' }, 500);
    const db = env.DB;

    let body: any;
    try {
      body = await request.json();
    } catch {
      return j({ error: 'Bad JSON' }, 400);
    }
    if (!Array.isArray(body?.videos) || !Array.isArray(body?.playlists)) {
      return j({ error: 'Invalid payload; expected {videos:[], playlists:[]}' }, 400);
    }

    await ensureSchema(db);

    // wipe & write
    await db.exec(`DELETE FROM playlist_videos;`);
    await db.exec(`DELETE FROM playlists;`);
    await db.exec(`DELETE FROM videos;`);

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
              `INSERT INTO playlist_videos (playlist_id, video_id, position) VALUES (?, ?, ?)`
            )
            .bind(p.id, vid, pos++)
            .run();
        }
      }
    }

    return j({ ok: true, updatedAt: new Date().toISOString() });
  } catch (e: any) {
    return j({ error: String(e?.message || e) }, 500);
  }
};
