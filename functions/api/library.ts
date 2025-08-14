// functions/api/library.ts
// GET  /api/library  -> { videos, playlists }
// PUT  /api/library  -> { mode?: 'merge' | 'replace', videos?: Video[], playlists?: Playlist[] }
// - merge (default): upsert videos, upsert playlists, and if a playlist has .videos provided,
//   we replace ONLY that playlist's mapping. Nothing else is touched.
// - replace: wipe all tables, then insert exactly what you send.
// Also: safety fuse blocks empty overwrites unless mode:'replace'.

type Env = { DB?: D1Database };

const headers = {
  'content-type': 'application/json',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,PUT,OPTIONS',
};
const resp = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

// DDL (single-line to avoid D1 parser quirks)
async function ensure(db: D1Database) {
  await db.prepare(
    'CREATE TABLE IF NOT EXISTS videos (id TEXT PRIMARY KEY, title TEXT, thumbnail TEXT, duration TEXT, channelTitle TEXT, publishedAt TEXT)'
  ).run();
  await db.prepare(
    'CREATE TABLE IF NOT EXISTS playlists (id TEXT PRIMARY KEY, name TEXT, description TEXT, createdAt TEXT, thumbnail TEXT)'
  ).run();
  await db.prepare(
    'CREATE TABLE IF NOT EXISTS playlist_videos (playlist_id TEXT, video_id TEXT, position INTEGER, PRIMARY KEY (playlist_id, position))'
  ).run();
}

async function counts(db: D1Database) {
  const v = await db.prepare('SELECT COUNT(*) AS c FROM videos').all();
  const p = await db.prepare('SELECT COUNT(*) AS c FROM playlists').all();
  const vc = Number((v.results?.[0] as any)?.c ?? 0);
  const pc = Number((p.results?.[0] as any)?.c ?? 0);
  return { vc, pc };
}

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, { headers });

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    if (!env.DB) return resp({ error: 'Missing D1 binding "DB"' }, 500);
    const db = env.DB;
    await ensure(db);

    const vids = await db.prepare(
      'SELECT id, title, thumbnail, duration, channelTitle, publishedAt FROM videos'
    ).all();

    const pls = await db.prepare(
      'SELECT id, name, description, createdAt, thumbnail FROM playlists'
    ).all();

    const playlists: any[] = [];
    for (const p of (pls.results as any[]) ?? []) {
      const pv = await db.prepare(
        'SELECT pv.video_id, pv.position, v.title, v.thumbnail, v.duration, v.channelTitle, v.publishedAt ' +
        'FROM playlist_videos pv JOIN videos v ON v.id = pv.video_id ' +
        'WHERE pv.playlist_id = ? ORDER BY pv.position ASC'
      ).bind((p as any).id).all();

      playlists.push({
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

    return resp({
      version: 1,
      updatedAt: new Date().toISOString(),
      videos: vids.results ?? [],
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
    try { body = await request.json(); } catch { return resp({ error: 'Bad JSON' }, 400); }

    const mode: 'merge' | 'replace' = body?.mode === 'replace' ? 'replace' : 'merge';
    const videos = Array.isArray(body?.videos) ? body.videos : [];
    const playlists = Array.isArray(body?.playlists) ? body.playlists : [];

    // SAFETY FUSE: ignore empty overwrites unless explicit replace
    if (mode !== 'replace' && videos.length === 0 && playlists.length === 0) {
      const { vc, pc } = await counts(db);
      if (vc + pc > 0) {
        return resp({
          ok: false,
          ignored: true,
          reason: 'Empty payload ignored to protect existing data. Send mode:"replace" to wipe intentionally or include data to merge.',
        });
      }
      // DB empty anyway — nothing to do
      return resp({ ok: true, nochange: true });
    }

    // ---- REPLACE (old behavior, but explicit) ----
    if (mode === 'replace') {
      // de-dupe videos by id to avoid UNIQUE failures
      const uniq: Record<string, any> = {};
      for (const v of videos) if (v?.id && !uniq[v.id]) uniq[v.id] = v;
      const vidsArr = Object.values(uniq);

      const batch: D1PreparedStatement[] = [];
      batch.push(db.prepare('DELETE FROM playlist_videos'));
      batch.push(db.prepare('DELETE FROM playlists'));
      batch.push(db.prepare('DELETE FROM videos'));

      for (const v of vidsArr) {
        batch.push(
          db.prepare(
            'INSERT INTO videos (id, title, thumbnail, duration, channelTitle, publishedAt) VALUES (?, ?, ?, ?, ?, ?)'
          ).bind(v.id, v.title ?? '', v.thumbnail ?? '', v.duration ?? '', v.channelTitle ?? '', v.publishedAt ?? '')
        );
      }

      for (const p of playlists) {
        if (!p?.id) continue;
        batch.push(
          db.prepare(
            'INSERT INTO playlists (id, name, description, createdAt, thumbnail) VALUES (?, ?, ?, ?, ?)'
          ).bind(p.id, p.name ?? '', p.description ?? '', p.createdAt ?? '', p.thumbnail ?? '')
        );

        if (Array.isArray(p.videos)) {
          let pos = 0;
          for (const vv of p.videos) {
            const vid = typeof vv === 'string' ? vv : vv?.id;
            if (!vid) continue;
            batch.push(
              db.prepare('INSERT INTO playlist_videos (playlist_id, video_id, position) VALUES (?, ?, ?)')
                .bind(p.id, vid, pos++)
            );
          }
        }
      }

      await db.batch(batch);
      return resp({ ok: true, mode: 'replace', updatedAt: new Date().toISOString() });
    }

    // ---- MERGE (default & safe) ----
    // Upsert videos
    for (const v of videos) {
      if (!v?.id) continue;
      await db.prepare(
        'INSERT OR IGNORE INTO videos (id, title, thumbnail, duration, channelTitle, publishedAt) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(v.id, v.title ?? '', v.thumbnail ?? '', v.duration ?? '', v.channelTitle ?? '', v.publishedAt ?? '').run();
      await db.prepare(
        'UPDATE videos SET title=?, thumbnail=?, duration=?, channelTitle=?, publishedAt=? WHERE id=?'
      ).bind(v.title ?? '', v.thumbnail ?? '', v.duration ?? '', v.channelTitle ?? '', v.publishedAt ?? '', v.id).run();
    }

    // Upsert playlists & optionally replace ONLY that playlist's mapping
    for (const p of playlists) {
      if (!p?.id) continue;
      await db.prepare(
        'INSERT OR IGNORE INTO playlists (id, name, description, createdAt, thumbnail) VALUES (?, ?, ?, ?, ?)'
      ).bind(p.id, p.name ?? '', p.description ?? '', p.createdAt ?? '', p.thumbnail ?? '').run();
      await db.prepare(
        'UPDATE playlists SET name=?, description=?, createdAt=?, thumbnail=? WHERE id=?'
      ).bind(p.name ?? '', p.description ?? '', p.createdAt ?? '', p.thumbnail ?? '', p.id).run();

      if (Array.isArray(p.videos)) {
        await db.prepare('DELETE FROM playlist_videos WHERE playlist_id=?').bind(p.id).run();
        let pos = 0;
        for (const vv of p.videos) {
          const vid = typeof vv === 'string' ? vv : vv?.id;
          if (!vid) continue;
          await db.prepare(
            'INSERT INTO playlist_videos (playlist_id, video_id, position) VALUES (?, ?, ?)'
          ).bind(p.id, vid, pos++).run();
        }
      }
    }

    return resp({ ok: true, mode: 'merge', updatedAt: new Date().toISOString() });
  } catch (e: any) {
    return resp({ error: String(e?.message || e) }, 500);
  }
};
