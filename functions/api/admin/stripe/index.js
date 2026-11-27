// Admin: state of the online shop and Valentyna's Stripe connection.
import { json, err } from '../../../../lib/util.js';
import { shopState, getSetting, setSetting } from '../../../../lib/shop.js';

export const onRequestGet = async ({ env }) => {
  const s = await shopState(env);
  return json({ ...s, accountName: await getSetting(env, 'stripe_account_name'), connectedAt: await getSetting(env, 'stripe_connected_at') });
};

// Disconnects Valentyna's account from the platform (she keeps her Stripe account and money).
export const onRequestDelete = async ({ env }) => {
  const account = await getSetting(env, 'stripe_account');
  if (!account) return json({ ok: true });
  if (env.STRIPE_CLIENT_ID && env.STRIPE_SECRET_KEY) {
    const res = await fetch('https://connect.stripe.com/oauth/deauthorize', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'content-type': 'application/x-www-form-urlencoded' },
      body: `client_id=${encodeURIComponent(env.STRIPE_CLIENT_ID)}&stripe_user_id=${encodeURIComponent(account)}`,
    });
    if (!res.ok && res.status !== 401) return err(502, 'Stripe не ответил, попробуйте ещё раз');
  }
  for (const k of ['stripe_account', 'stripe_account_name', 'stripe_connected_at']) await setSetting(env, k, null);
  return json({ ok: true });
};
