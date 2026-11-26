import { json, err, rowToProduct, cleanProduct } from '../../../../lib/util.js';

const load = (env, id) => env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();

export const onRequestPut = async ({ env, params, request }) => {
  if (!(await load(env, params.id))) return err(404, 'Открытка не найдена');
  const body = await request.json().catch(() => null);
  if (!body) return err(400, 'Пустой запрос');
  const f = cleanProduct(body);
  const keys = Object.keys(f);
  if (keys.length) {
    const sql = `UPDATE products SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`;
    await env.DB.prepare(sql).bind(...keys.map((k) => f[k]), params.id).run();
  }
  return json({ product: rowToProduct(await load(env, params.id)) });
};

export const onRequestDelete = async ({ env, params }) => {
  await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
};
