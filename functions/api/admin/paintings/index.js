import { json, rowToPainting, cleanInput } from '../../../../lib/util.js';

export const onRequestGet = async ({ env }) => {
  const { results } = await env.DB.prepare('SELECT * FROM paintings ORDER BY sort ASC, created_at DESC').all();
  return json({ paintings: results.map(rowToPainting) });
};

// Creates an empty draft so photos can be uploaded right away.
export const onRequestPost = async ({ env, request }) => {
  const body = await request.json().catch(() => ({}));
  const f = cleanInput(body);
  const row = await env.DB.prepare(
    "INSERT INTO paintings (title, theme, status, year) VALUES (?, ?, 'draft', ?) RETURNING *"
  ).bind(f.title || '', f.theme || 'wildflowers', new Date().getUTCFullYear()).first();
  return json({ painting: rowToPainting(row) }, 201);
};
