import { ensureSchema } from '../lib/schema.js';

// Sitemap for search engines: the home page plus one real URL per painting (/art/<slug>).
export const onRequestGet = async ({ env, request }) => {
  const origin = new URL(request.url).origin;
  await ensureSchema(env);
  const { results } = await env.DB.prepare(
    "SELECT id, slug, updated_at FROM paintings WHERE status != 'draft' ORDER BY sort ASC, created_at DESC"
  ).all();
  const day = (s) => String(s || '').slice(0, 10);
  const urls = [`<url><loc>${origin}/</loc></url>`].concat(
    results.map((r) => `<url><loc>${origin}/art/${encodeURIComponent(r.slug || r.id)}</loc>${r.updated_at ? `<lastmod>${day(r.updated_at)}</lastmod>` : ''}</url>`)
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
};
