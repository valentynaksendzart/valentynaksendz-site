// Admin: list of online orders, newest first.
import { json } from '../../../lib/util.js';

export const onRequestGet = async ({ env }) => {
  const { results } = await env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC, id DESC LIMIT 300').all();
  const orders = results.map((o) => {
    let address = null;
    try { address = JSON.parse(o.address || 'null'); } catch {}
    return { ...o, address };
  });
  const t = await env.DB.prepare(
    "SELECT COUNT(*) AS n, SUM(product_p) AS product, SUM(shipping_p) AS shipping, SUM(fee_p) AS fee FROM orders WHERE status != 'refunded'"
  ).first();
  return json({ orders, totals: { count: t.n || 0, product: t.product || 0, shipping: t.shipping || 0, fee: t.fee || 0 } });
};
