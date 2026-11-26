import { json, toPublic } from '../../lib/util.js';
import { ensureSchema } from '../../lib/schema.js';

// Public list for the site: everything except drafts.
export const onRequestGet = async ({ env }) => {
  await ensureSchema(env);
  const { results } = await env.DB.prepare(
    "SELECT * FROM paintings WHERE status != 'draft' ORDER BY sort ASC, created_at DESC"
  ).all();
  // Greeting cards on sale, attached to their painting.
  const { results: cards } = await env.DB.prepare(
    "SELECT * FROM products WHERE kind = 'card' AND status = 'available' AND price_p > 0 ORDER BY id"
  ).all();
  const byPainting = {};
  for (const c of cards)
    (byPainting[c.painting_id] ||= []).push({ sku: c.sku, format: c.format, price: c.price_p / 100, left: Math.max(0, c.stock - c.sold) });
  const paintings = results.map((r) => ({ ...toPublic(r), cards: byPainting[r.id] || [] }));
  return json({ paintings }, 200, { 'cache-control': 'public, max-age=60' });
};
