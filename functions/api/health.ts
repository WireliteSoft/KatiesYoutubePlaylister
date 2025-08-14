// /functions/api/health.ts
type Env = { DB?: D1Database };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    if (!env.DB) return json({ ok: false, error: 'Missing D1 binding "DB"' }, 500);

    // list tables; proves binding works
    const rs = await env.DB.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
    ).all();

    return json({
      ok: true,
      d1: true,
      tables: (rs.results ?? []).map((r: any) => r.name),
    });
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
};
