import { json, toPublic } from '../../lib/util.js';
import { ensureSchema } from '../../lib/schema.js';

// Public list for the site: everything except drafts.
export const onRequestGet = async ({ env }) => {
  await ensureSchema(env);
  const { results } = await env.DB.prepare(
    "SELECT * FROM paintings WHERE status != 'draft' ORDER BY sort ASC, created_at DESC"
  ).all();
  return json({ paintings: results.map(toPublic) }, 200, { 'cache-control': 'public, max-age=60' });
};
