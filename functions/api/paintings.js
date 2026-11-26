import { json, toPublic } from '../../lib/util.js';

// Public list for the site: everything except drafts.
export const onRequestGet = async ({ env }) => {
  const { results } = await env.DB.prepare(
    "SELECT * FROM paintings WHERE status != 'draft' ORDER BY sort ASC, created_at DESC"
  ).all();
  return json({ paintings: results.map(toPublic) }, 200, { 'cache-control': 'public, max-age=60' });
};
