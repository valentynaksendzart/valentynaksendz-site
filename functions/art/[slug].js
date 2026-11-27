import { ensureSchema } from '../../lib/schema.js';
import { toPublic } from '../../lib/util.js';

// Real, shareable URL for each painting: /art/<slug>.
// Serves the normal site (it opens the painting itself) with the painting's own title,
// description, Open Graph image and Product/VisualArtwork JSON-LD, so search engines and
// Facebook/WhatsApp/Pinterest previews show the right picture without running JavaScript.
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export const onRequestGet = async ({ env, params, request }) => {
  const url = new URL(request.url);
  const page = await env.ASSETS.fetch(new Request(url.origin + '/', request));
  await ensureSchema(env);
  const row = await env.DB.prepare("SELECT * FROM paintings WHERE (slug = ?1 OR CAST(id AS TEXT) = ?1) AND status != 'draft' LIMIT 1")
    .bind(String(params.slug)).first();
  if (!row) return new Response(page.body, { status: 404, headers: page.headers });

  const w = toPublic(row);
  const pageUrl = `${url.origin}/art/${encodeURIComponent(w.id)}`;
  const title = `${w.title} by Valentyna Ksendz`;
  const multi = w.panels > 1, names = { 2: 'Diptych', 3: 'Triptych', 4: 'Polyptych' };
  const size = w.w && w.h ? (multi ? ` ${names[w.panels] || 'Polyptych'}, ${w.panels} canvases of ${w.w} × ${w.h} cm.` : ` ${w.w} × ${w.h} cm.`) : '';
  const desc = ((w.story || `${w.title}, original ${String(w.medium || 'oil').toLowerCase()} painting by Valentyna Ksendz.`).replace(/\s+/g, ' ').slice(0, 140) + size).trim();
  const img = w.photos[0] ? url.origin + w.photos[0].src : null;

  const ld = {
    '@context': 'https://schema.org',
    '@type': ['VisualArtwork', 'Product'],
    name: w.title,
    description: desc,
    url: pageUrl,
    sku: w.sku,
    artform: 'Painting',
    artMedium: w.medium,
    artworkSurface: w.support,
    creator: { '@type': 'Person', name: 'Valentyna Ksendz', url: url.origin + '/' },
    brand: { '@type': 'Brand', name: 'Valentyna Ksendz Art' },
  };
  if (img) ld.image = img;
  if (w.w) ld.width = { '@type': 'QuantitativeValue', value: multi ? Math.round((w.panels * w.w + (w.panels - 1) * (w.gap ?? 5)) * 10) / 10 : w.w, unitCode: 'CMT' };
  if (w.h) ld.height = { '@type': 'QuantitativeValue', value: w.h, unitCode: 'CMT' };
  if (w.year) ld.dateCreated = String(w.year);
  if (w.price) ld.offers = {
    '@type': 'Offer', price: w.price, priceCurrency: 'GBP', url: pageUrl,
    availability: w.status === 'sold' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
  };

  const setContent = (v) => ({ element: (e) => e.setAttribute('content', v) });
  let rw = new HTMLRewriter()
    .on('title', { element: (e) => e.setInnerContent(title) })
    .on('meta[name="description"]', setContent(desc))
    .on('meta[property="og:title"]', setContent(title))
    .on('meta[property="og:description"]', setContent(desc))
    .on('meta[property="og:url"]', setContent(pageUrl))
    .on('meta[property="og:type"]', setContent('product'))
    .on('link[rel="canonical"]', { element: (e) => e.setAttribute('href', pageUrl) })
    .on('head', {
      element: (e) => e.append(
        (img ? `<meta property="og:image" content="${esc(img)}"><meta property="og:image:alt" content="${esc(w.title)}, painting by Valentyna Ksendz">` : '') +
        `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`,
        { html: true }
      ),
    });
  const headers = new Headers(page.headers);
  headers.set('cache-control', 'public, max-age=300');
  return rw.transform(new Response(page.body, { status: 200, headers }));
};
