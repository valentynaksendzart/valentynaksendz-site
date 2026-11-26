import { requireAdmin } from '../../../lib/auth.js';
import { ensureSchema } from '../../../lib/schema.js';

export const onRequest = async (context) => {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  const { request } = context;
  // Same-origin check for writes (blocks cross-site form posts).
  if (request.method !== 'GET') {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return new Response('Bad origin', { status: 403 });
  }
  await ensureSchema(context.env);
  const res = await context.next();
  const out = new Response(res.body, res);
  out.headers.set('cache-control', 'no-store');
  return out;
};
