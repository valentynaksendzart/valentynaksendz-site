import { json, err, rowToPainting, cleanInput, slugify } from '../../../../lib/util.js';

const load = (env, id) => env.DB.prepare('SELECT * FROM paintings WHERE id = ?').bind(id).first();

export const onRequestGet = async ({ env, params }) => {
  const row = await load(env, params.id);
  return row ? json({ painting: rowToPainting(row) }) : err(404, 'Картина не найдена');
};

export const onRequestPut = async ({ env, params, request }) => {
  const old = await load(env, params.id);
  if (!old) return err(404, 'Картина не найдена');
  const body = await request.json().catch(() => null);
  if (!body) return err(400, 'Пустой запрос');
  const f = cleanInput(body);

  if (f.status === 'sold' && old.status !== 'sold') f.sold_at = new Date().toISOString();
  if (f.status && f.status !== 'sold') f.sold_at = null;

  // Stable public address, made once from the English title when first published.
  if (!old.slug && (f.status === 'available' || f.status === 'sold')) {
    const base = slugify(f.title ?? old.title) || 'painting';
    f.slug = `${base}-${old.id}`;
  }

  const ed = f.prints_edition ?? old.prints_edition;
  for (const k of ['print_paper_sold', 'print_canvas_sold']) if (k in f) f[k] = Math.min(f[k], ed);

  const keys = Object.keys(f);
  if (keys.length) {
    const sql = `UPDATE paintings SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`;
    await env.DB.prepare(sql).bind(...keys.map((k) => f[k]), params.id).run();
  }

  // Remove files of photos that were taken off the painting.
  if ('photos' in f) {
    const keep = new Set(JSON.parse(f.photos).flatMap((p) => [p.orig, p.large, p.thumb, p.ar]));
    const gone = JSON.parse(old.photos || '[]').flatMap((p) => [p.orig, p.large, p.thumb, p.ar]).filter((k) => k && !keep.has(k));
    if (gone.length) await env.PHOTOS.delete(gone);
  }
  return json({ painting: rowToPainting(await load(env, params.id)) });
};

export const onRequestDelete = async ({ env, params }) => {
  const old = await load(env, params.id);
  if (!old) return err(404, 'Картина не найдена');
  const keys = JSON.parse(old.photos || '[]').flatMap((p) => [p.orig, p.large, p.thumb, p.ar]).filter(Boolean);
  if (keys.length) await env.PHOTOS.delete(keys);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM products WHERE painting_id = ?').bind(params.id),
    env.DB.prepare('DELETE FROM paintings WHERE id = ?').bind(params.id),
  ]);
  return json({ ok: true });
};
