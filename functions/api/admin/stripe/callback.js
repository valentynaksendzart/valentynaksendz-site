// Stripe returns here after Valentyna connects her account.
import { setSetting } from '../../../../lib/shop.js';
import { stripe } from '../../../../lib/stripe.js';

const back = (origin, msg) => Response.redirect(`${origin}/admin/#/sales${msg ? '?msg=' + encodeURIComponent(msg) : ''}`, 302);

export const onRequestGet = async ({ request, env }) => {
  const url = new URL(request.url);
  const origin = url.origin;
  if (url.searchParams.get('error')) return back(origin, 'Подключение отменено');
  const state = url.searchParams.get('state');
  const cookie = (request.headers.get('cookie') || '').match(/(?:^|;\s*)stripe_state=([a-f0-9]+)/);
  if (!state || !cookie || cookie[1] !== state) return back(origin, 'Ссылка устарела, нажмите «Подключить Stripe» ещё раз');

  const res = await fetch('https://connect.stripe.com/oauth/token', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=authorization_code&code=' + encodeURIComponent(url.searchParams.get('code') || ''),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.stripe_user_id) return back(origin, 'Stripe не подтвердил подключение, попробуйте ещё раз');

  let name = '';
  try {
    const a = await stripe(env, 'GET', 'accounts/' + data.stripe_user_id);
    name = (a.business_profile && a.business_profile.name) || (a.settings && a.settings.dashboard && a.settings.dashboard.display_name) || a.email || '';
  } catch {}
  await setSetting(env, 'stripe_account', data.stripe_user_id);
  await setSetting(env, 'stripe_account_name', name);
  await setSetting(env, 'stripe_connected_at', new Date().toISOString());
  const r = back(origin, 'Stripe подключён');
  const out = new Response(null, r);
  out.headers.set('set-cookie', 'stripe_state=; Path=/api/admin/stripe; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  return out;
};
