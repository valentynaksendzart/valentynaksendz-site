import { json, err, rowToProduct, cleanProduct, cardSku } from '../../../../lib/util.js';

// ?painting=ID lists the cards of one painting; without it, all cards.
export const onRequestGet = async ({ env, request }) => {
  const pid = new URL(request.url).searchParams.get('painting');
  const q = pid
    ? env.DB.prepare('SELECT * FROM products WHERE painting_id = ? ORDER BY id').bind(pid)
    : env.DB.prepare('SELECT * FROM products ORDER BY id');
  const { results } = await q.all();
  return json({ products: results.map(rowToProduct) });
};

// Creates a greeting card for a painting and gives it its SKU.
export const onRequestPost = async ({ env, request }) => {
  const body = await request.json().catch(() => ({}));
  const pid = Number(body.painting_id);
  if (!pid || !(await env.DB.prepare('SELECT id FROM paintings WHERE id = ?').bind(pid).first()))
    return err(400, 'Нет такой картины');
  const f = cleanProduct(body);
  const row = await env.DB.prepare(
    "INSERT INTO products (kind, painting_id, format, price_p, stock, status) VALUES ('card', ?, ?, ?, ?, 'draft') RETURNING id"
  ).bind(pid, f.format ?? '', f.price_p ?? null, f.stock ?? 0).first();
  const p = await env.DB.prepare('UPDATE products SET sku = ? WHERE id = ? RETURNING *').bind(cardSku(row.id), row.id).first();
  return json({ product: rowToProduct(p) }, 201);
};
