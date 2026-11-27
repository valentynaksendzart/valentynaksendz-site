// Public: tells the site whether the Buy buttons should open Stripe Checkout.
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/schema.js';
import { shopState, FRAME_PRICES, SHIPPING } from '../../lib/shop.js';

export const onRequestGet = async ({ env }) => {
  await ensureSchema(env);
  const s = await shopState(env);
  // pounds, so the page can show them next to the prices
  const frames = Object.fromEntries(Object.entries(FRAME_PRICES).map(([k, v]) => [k, v == null ? null : v / 100]));
  const shipping = Object.fromEntries(Object.entries(SHIPPING).map(([z, r]) => [z, Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v == null ? null : v / 100]))]));
  return json({ open: s.open, frames, shipping }, 200, { 'cache-control': 'public, max-age=60' });
};
