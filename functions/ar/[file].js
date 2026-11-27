import { ensureSchema } from '../../lib/schema.js';
import { rowToPainting } from '../../lib/util.js';
import { buildGLB } from '../../ar.js';

// GET /ar/<slug>.glb : true-size 3D model of a painting for Android "See it on your own wall" (Scene Viewer).
// Made on the fly from the sizes in the admin panel and the JPEG copy of the main photo (the "ar" copy,
// made by the admin panel), so changing the size or depth in the admin shows up straight away.
export const onRequestGet = async ({ env, params }) => {
  const m = /^([\w-]{1,120})\.glb$/.exec(String(params.file || ''));
  if (!m) return new Response('Not found', { status: 404 });
  await ensureSchema(env);
  const row = await env.DB.prepare("SELECT * FROM paintings WHERE (slug = ?1 OR CAST(id AS TEXT) = ?1) AND status != 'draft' LIMIT 1")
    .bind(m[1]).first();
  if (!row) return new Response('Not found', { status: 404 });
  const p = rowToPainting(row);
  const ph = p.photos.find((x) => x.kind !== 'back');
  if (!ph || !ph.ar || !(p.width_cm > 0 && p.height_cm > 0)) return new Response('No 3D model for this painting yet', { status: 404 });
  const obj = await env.PHOTOS.get(ph.ar);
  if (!obj) return new Response('Not found', { status: 404 });
  const n = p.panels > 1 ? Math.min(4, p.panels) : 1;
  const max = Math.max(p.width_cm, p.height_cm);
  const glb = buildGLB({
    pw: p.width_cm, h: p.height_cm, panels: n, gap: n > 1 ? (p.gap_cm >= 0 && p.gap_cm !== null ? p.gap_cm : 5) : 0,
    depth: p.depth_cm > 0 ? p.depth_cm : max >= 70 ? 3.8 : 1.8, tw: ph.aw || ph.w, th: ph.ah || ph.h,
  }, new Uint8Array(await obj.arrayBuffer()));
  return new Response(glb, {
    headers: { 'content-type': 'model/gltf-binary', 'cache-control': 'public, max-age=300', 'access-control-allow-origin': '*' },
  });
};
