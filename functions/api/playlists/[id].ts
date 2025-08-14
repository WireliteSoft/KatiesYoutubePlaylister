// Cloudflare Pages Function: DELETE /api/playlists/:id
// Removes the playlist and any rows in playlist_videos for that playlist.

type Env = { DB?: D1Database };

const headers: Record<string, string> = {
  'content-type': 'application/json',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'DELETE,OPTIONS',
};

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, { headers });

export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  try {
    const db = ctx.env.DB;
    if (!db) {
      return new Response(JSON.stringify({ error: 'Missing D1 binding "DB"' }), {
        status: 500,
        headers,
      });
    }

    const id = String(ctx.params.id || '').trim();
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing playlist id' }), {
        status: 400,
        headers,
      });
    }

    // Delete mappings first, then the playlist itself
    await db.prepare('DELETE FROM playlist_videos WHERE playlist_id = ?').bind(id).run();
    await db.prepare('DELETE FROM playlists WHERE id = ?').bind(id).run();

    return new Response(JSON.stringify({ ok: true, id }), { headers });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers,
    });
  }
};
