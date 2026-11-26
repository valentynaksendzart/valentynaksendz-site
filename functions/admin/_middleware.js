import { requireAdmin } from '../../lib/auth.js';

// Protects the admin page itself (Access also guards it at the edge).
export const onRequest = async (context) => {
  const denied = await requireAdmin(context);
  if (denied) {
    return new Response('Вход только для владельца сайта.', { status: denied.status, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
  const res = await context.next();
  const out = new Response(res.body, res);
  out.headers.set('cache-control', 'no-store');
  out.headers.set('x-robots-tag', 'noindex');
  return out;
};
