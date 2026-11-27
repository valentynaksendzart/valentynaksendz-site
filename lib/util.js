export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });

export const err = (status, message) => json({ error: message }, status);

// 'impasto' stays valid so older paintings keep their theme, but the admin no longer offers it.
export const THEMES = ['wildflowers', 'floral', 'waterlilies', 'irises', 'farmyard', 'impressions', 'splash', 'impasto'];
export const STATUSES = ['draft', 'available', 'sold'];

export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

const intOrNull = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const numOrNull = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : null;
};
const str = (v, max = 200) => (v == null ? '' : String(v).slice(0, max));
const url = (v) => {
  const s = str(v, 500).trim();
  if (!s) return null;
  try {
    const u = new URL(s.startsWith('http') ? s : 'https://' + s);
    return u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
};

// Whitelist + coerce the editable fields of a painting.
export function cleanInput(b) {
  const out = {};
  if ('title' in b) out.title = str(b.title, 160).trim();
  if ('theme' in b && THEMES.includes(b.theme)) out.theme = b.theme;
  if ('width_cm' in b) out.width_cm = numOrNull(b.width_cm);
  if ('height_cm' in b) out.height_cm = numOrNull(b.height_cm);
  if ('depth_cm' in b) { const d = numOrNull(b.depth_cm); out.depth_cm = d == null ? null : Math.min(15, Math.max(0.5, d)); }
  if ('style' in b) out.style = str(b.style, 80).trim();
  if ('medium' in b) out.medium = str(b.medium, 80);
  if ('support' in b) out.support = str(b.support, 80);
  if ('year' in b) out.year = intOrNull(b.year);
  if ('price' in b) out.price = intOrNull(b.price);
  if ('status' in b && STATUSES.includes(b.status)) out.status = b.status;
  if ('sold_price' in b) out.sold_price = intOrNull(b.sold_price);
  if ('story' in b) out.story = str(b.story, 5000);
  if ('story_ru' in b) out.story_ru = str(b.story_ru, 5000);
  if ('reel_url' in b) out.reel_url = url(b.reel_url);
  if ('prints_edition' in b) out.prints_edition = Math.min(intOrNull(b.prints_edition) ?? 10, 1000);
  for (const k of ['print_paper_price', 'print_canvas_price']) if (k in b) out[k] = intOrNull(b[k]);
  for (const k of ['print_paper_sold', 'print_canvas_sold']) if (k in b) out[k] = intOrNull(b[k]) ?? 0;
  if ('sort' in b) out.sort = Math.round(Number(b.sort) || 0);
  if ('photos' in b && Array.isArray(b.photos)) {
    out.photos = JSON.stringify(
      b.photos.slice(0, 30).filter((p) => p && typeof p.large === 'string').map((p) => ({
        id: str(p.id, 64),
        orig: str(p.orig, 200),
        large: str(p.large, 200),
        thumb: str(p.thumb, 200),
        w: intOrNull(p.w),
        h: intOrNull(p.h),
        bytes: intOrNull(p.bytes) ?? 0,
        kind: ['art', 'interior', 'detail', 'back'].includes(p.kind) ? p.kind : 'art',
      }))
    );
  }
  return out;
}

export function rowToPainting(r) {
  let photos = [];
  try { photos = JSON.parse(r.photos || '[]'); } catch {}
  return { ...r, photos };
}

// Shape used by the public site (matches the WORKS array in index.html).
export function toPublic(r) {
  const p = rowToPainting(r);
  const img = (k) => (k ? '/img/' + k : null);
  return {
    id: p.slug || String(p.id),
    sku: paintingSku(p.id),
    theme: p.theme,
    title: p.title,
    w: p.width_cm,
    h: p.height_cm,
    depth: p.depth_cm,
    style: p.style || '',
    medium: p.medium,
    support: p.support,
    year: p.year,
    price: p.price,
    status: p.status,
    story: p.story,
    reel: p.reel_url,
    edition: p.prints_edition,
    prints: {
      paper: p.print_paper_price ? { price: p.print_paper_price, sold: p.print_paper_sold } : null,
      canvas: p.print_canvas_price ? { price: p.print_canvas_price, sold: p.print_canvas_sold } : null,
    },
    photos: p.photos.map((ph) => ({ src: img(ph.large), thumb: img(ph.thumb), w: ph.w, h: ph.h, kind: ph.kind })),
  };
}

// ---- SKUs ----
// Original VK-O-0001, prints VK-O-0001-PP (paper) / -PC (canvas), cards VK-C-0001.
const pad = (n) => String(n).padStart(4, '0');
export const paintingSku = (id) => `VK-O-${pad(id)}`;
export const cardSku = (id) => `VK-C-${pad(id)}`;

// ---- Products (greeting cards) ----
const int = (v, min, max) => {
  if (v === '' || v == null) return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : null;
};
export function cleanProduct(b) {
  const out = {};
  if ('format' in b) out.format = String(b.format ?? '').slice(0, 120);
  // price comes in pounds (3.5) and is kept in pence (350)
  if ('price' in b) out.price_p = b.price === '' || b.price == null ? null : int(Number(String(b.price).replace(',', '.')) * 100, 0, 10000000);
  if ('stock' in b) out.stock = int(b.stock, 0, 100000) ?? 0;
  if ('sold' in b) out.sold = int(b.sold, 0, 100000) ?? 0;
  if ('status' in b && ['draft', 'available'].includes(b.status)) out.status = b.status;
  return out;
}
export const rowToProduct = (r) => ({ ...r, price: r.price_p == null ? null : r.price_p / 100 });
