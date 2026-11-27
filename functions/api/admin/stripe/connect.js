// Admin: "Подключить Stripe" sends Valentyna to Stripe to sign in (or sign up) and
// connect her own Standard account to Valentin's platform.
import { err } from '../../../../lib/util.js';

export const onRequestGet = async ({ request, env }) => {
  if (!env.STRIPE_CLIENT_ID || !env.STRIPE_SECRET_KEY) return err(503, 'Ключи Stripe ещё не добавлены в Cloudflare');
  const origin = new URL(request.url).origin;
  const state = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const q = new URLSearchParams({
    response_type: 'code',
    client_id: env.STRIPE_CLIENT_ID,
    scope: 'read_write',
    state,
    redirect_uri: origin + '/api/admin/stripe/callback',
    'stripe_user[country]': 'GB',
    'stripe_user[business_type]': 'individual',
    'stripe_user[url]': origin,
    'stripe_user[product_description]': 'Original paintings, limited edition prints and greeting cards by the artist',
    'stripe_user[currency]': 'gbp',
  });
  return new Response(null, {
    status: 302,
    headers: {
      location: 'https://connect.stripe.com/oauth/authorize?' + q,
      'set-cookie': `stripe_state=${state}; Path=/api/admin/stripe; HttpOnly; Secure; SameSite=Lax; Max-Age=1800`,
    },
  });
};
