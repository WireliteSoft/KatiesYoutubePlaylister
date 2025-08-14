// functions/api/library.ts
// GET  /api/library  -> { videos, playlists }
// PUT  /api/library  -> replace entire library { videos, playlists }

type Env = { DB?: D1Database };

const headers = {
  'content-type': 'application/json',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,PUT,OPTIONS',
};
const resp = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

// Use prepare().run() for DDL to avoid "incomplete input" on exec().
async function ensure(db: D1Database) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS videos (
        id TEXT PRIMARY KEY,
        title TEXT,
        thumbnail TEXT,
        duration TEXT,
        channelTitle TEXT,
        publishedAt TEXT
      )`
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS playlists (
        id TEXT PRIMARY KEY,
        name TEXT,
        description TEXT,
        createdAt TEXT,
        thumbnail TEXT
      )`
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS playlist_videos (
        playlist_id TEXT,
        video_id TEXT,
        position INTEGER,
        PRIMARY KEY (playlist_id, position)
      )`
    )
    .run();
}

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, { headers });

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    if (!env.DB) return resp({ error: 'Missing D1 binding "DB"' }, 500);
    const db = env.DB;
    await ensure(db);

    const vids = await db
      .prepare(
        `SELECT id, title, thumbnail, duration, channelTitle, publishedAt FROM videos`
      )
      .all()
      .catch(() => ({ results: [] as any[] }));

    const pls = await db
      .prepare(
        `SELECT id, name, description, createdAt, thumbnail FROM playlists`
      )
      .all()
      .catch(() => ({ results: [] as any[] }));

    const playlists: any[] = [];
    for (const p of (pls.results as any[]) ?? []) {
      const pv = await db
        .prepare(
          `SELECT pv.video_id, pv.position, v.title, v.thumbnail, v.duration,
                  v.channelTitle, v.publishedAt
             FROM playlist_videos pv
             JOIN videos v ON v.id = pv.video_id
            WHERE pv.playlist_id = ?
            ORDER BY pv.position ASC`
        )
        .bind(p.id)
        .all()
        .catch(() => ({ results: [] as any[] }));

      playlists.push({
        ...p,
        videos: (pv.results as any[]).map((r) => ({
          id: r.video_id,
          title: r.title,
          thumbnail: r.thumbnail,
          duration: r.duration,
          channelTitle: r.channelTitle,
          publishedAt: r.publishedAt,
        })),
      });
    }

    return resp({
      version: 1,
      updatedAt: new Date().toISOString(),
      videos: (vids.results as any[]) ?? [],
      playlists,
    });
  } catch (e: any) {
    return resp({ error: String(e?.message || e) }, 500);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  try {
    if (!env.DB) return resp({ error: 'Missing D1 binding "DB"' }, 500);
    const db = env.DB;
    await ensure(db);

    let body: any;
    try {
      body = await request.json();
    } catch {
      return resp({ error: 'Bad JSON' }, 400);
    }
    if (!Array.isArray(body?.videos) || !Array.isArray(body?.playlists)) {
      return resp(
        { error: 'Invalid payload; expected {videos:[], playlists:[]}' },
        400
      );
    }

    // Dedupe videos by id to avoid UNIQUE constraint failures
    const uniq: Record<string, any> = {};
    for (const v of body.videos) {
      if (v?.id && !uniq[v.id]) uniq[v.id] = v;
    }
    const videosArr = Object.values(uniq);

    // wipe & write in a batch
    const stmts: D1PreparedStatement[] = [];
    stmts.push(db.prepare(`DELETE FROM playlist_videos`));
    stmts.push(db.prepare(`DELETE FROM playlists`));
    stmts.push(db.prepare(`DELETE FROM videos`));

    for (const v of videosArr) {
      stmts.push(
        db
          .prepare(
            `INSERT INTO videos
             (id, title, thumbnail, duration, channelTitle, publishedAt)
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
      );
    }

    for (const p of body.playlists) {
      if (!p?.id) continue;
      stmts.push(
        db
          .prepare(
            `INSERT INTO playlists
             (id, name, description, createdAt, thumbnail)
             VALUES (?, ?, ?, ?, ?)`
          )
          .bind(
            p.id,
            p.name ?? '',
            p.description ?? '',
            p.createdAt ?? '',
            p.thumbnail ?? ''
          )
      );

      if (Array.isArray(p.videos)) {
        let pos = 0;
        for (const vv of p.videos) {
          const vid = typeof vv === 'string' ? vv : vv?.id;
          if (!vid) continue;
          stmts.push(
            db
              .prepare(
                `INSERT INTO playlist_videos (playlist_id, video_id, position)
                 VALUES (?, ?, ?)`
              )
              .bind(p.id, vid, pos++)
          );
        }
      }
    }

    await db.batch(stmts);

    return resp({ ok: true, updatedAt: new Date().toISOString() });
  } catch (e: any) {
    return resp({ error: String(e?.message || e) }, 500);
  }
};

