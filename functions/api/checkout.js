// Starts a Stripe Checkout on Valentyna's connected account (a "direct charge"):
// she is the seller, the money and Stripe's card fee are hers, and Stripe sends
// Valentin's platform fee (3% of the product price, never of shipping) to his account.
import { json, err } from '../../lib/util.js';
import { ensureSchema } from '../../lib/schema.js';
import { stripe } from '../../lib/stripe.js';
import { shopState, fee, FRAME_PRICES, FRAME_NAMES, ZONES, SHIPPING } from '../../lib/shop.js';

const PRINT = { PP: ['paper', 'Limited edition giclée print on paper'], PC: ['canvas', 'Limited edition giclée print on canvas'] };

// Finds what is being bought and checks it is still for sale. Prices in pence.
async function resolve(env, sku) {
  let m;
  if ((m = /^VK-O-(\d+)$/.exec(sku))) {
    const p = await env.DB.prepare('SELECT * FROM paintings WHERE id = ?').bind(Number(m[1])).first();
    if (!p || p.status !== 'available' || !(p.price > 0)) return { error: 'This painting is no longer available.' };
    return { kind: 'original', painting: p, price: p.price * 100, name: `${p.title || 'Original painting'} (original painting)` };
  }
  if ((m = /^VK-O-(\d+)-(PP|PC)$/.exec(sku))) {
    const p = await env.DB.prepare('SELECT * FROM paintings WHERE id = ?').bind(Number(m[1])).first();
    const [type, label] = PRINT[m[2]];
    const price = p && p[`print_${type}_price`];
    if (!p || p.status === 'draft' || !(price > 0)) return { error: 'This print is not available.' };
    if (p[`print_${type}_sold`] >= p.prints_edition) return { error: 'This edition is sold out.' };
    return { kind: 'print_' + type, painting: p, price: price * 100, name: `${p.title || 'Print'} — ${label}`, ship: 'print' };
  }
  if ((m = /^VK-C-(\d+)$/.exec(sku))) {
    const c = await env.DB.prepare(
      "SELECT products.*, paintings.title AS ptitle, paintings.photos AS pphotos, paintings.status AS pstatus FROM products JOIN paintings ON paintings.id = products.painting_id WHERE products.id = ?"
    ).bind(Number(m[1])).first();
    if (!c || c.status !== 'available' || c.pstatus === 'draft' || !(c.price_p > 0)) return { error: 'This card is not available.' };
    if (c.stock - c.sold <= 0) return { error: 'This card is sold out.' };
    return { kind: 'card', product: c, painting: { id: c.painting_id, title: c.ptitle, photos: c.pphotos }, price: c.price_p, name: `${c.ptitle || 'Greeting card'} — ${c.format || 'greeting card'}`, ship: 'card' };
  }
  return { error: 'Unknown item.' };
}

export const onRequestPost = async ({ request, env }) => {
  await ensureSchema(env);
  const shop = await shopState(env);
  if (!shop.open) return err(503, 'Online checkout is not open yet.');
  const origin = new URL(request.url).origin;
  const o = request.headers.get('origin');
  if (o && o !== origin) return err(403, 'Bad origin');

  const b = await request.json().catch(() => ({}));
  const sku = String(b.sku || '').toUpperCase();
  const zone = String(b.country || '');
  const frame = String(b.frame || 'none');
  if (!ZONES[zone]) return err(400, 'Please choose the country for delivery.');

  const item = await resolve(env, sku);
  if (item.error) return err(409, item.error);

  // Frame (originals only).
  let framePrice = 0;
  if (item.kind === 'original') {
    if (!(frame in FRAME_PRICES)) return err(400, 'Unknown frame.');
    framePrice = FRAME_PRICES[frame];
    if (framePrice == null) return err(409, 'The price of this frame is still being confirmed. Please choose “No frame” or “Help me choose”, or contact Valentyna.');
  }
  const framed = item.kind === 'original' && framePrice > 0;
  if (framed && ZONES[zone].noFramed) return err(409, 'Framed paintings cannot be sent to Australia or New Zealand. Please choose “No frame”.');

  const shipKey = item.kind === 'original' ? (framed ? 'original_framed' : 'original') : item.ship;
  const shipping = SHIPPING[zone][shipKey];
  if (shipping == null) return err(409, 'We cannot deliver this item to that country.');

  const productP = item.price + framePrice;
  const feeP = fee(productP);

  let image;
  try {
    const ph = JSON.parse(item.painting.photos || '[]').find((x) => x && x.kind !== 'back' && x.large);
    if (ph) image = origin + '/img/' + ph.large;
  } catch {}

  const lines = [{ price_data: { currency: 'gbp', unit_amount: item.price, product_data: { name: item.name, images: image ? [image] : undefined, metadata: { sku } } }, quantity: 1 }];
  if (framePrice > 0) lines.push({ price_data: { currency: 'gbp', unit_amount: framePrice, product_data: { name: FRAME_NAMES[frame] } }, quantity: 1 });

  const pid = item.painting && item.painting.id;
  const back = pid ? `#p-${pid}` : '#cards';
  const meta = {
    sku, kind: item.kind, zone, frame: item.kind === 'original' ? frame : '',
    painting_id: pid || '', product_id: item.product ? item.product.id : '',
    title: String(item.name).slice(0, 400), product_p: productP, shipping_p: shipping, fee_p: feeP,
  };
  const params = {
    mode: 'payment',
    line_items: lines,
    shipping_address_collection: { allowed_countries: ZONES[zone].countries },
    shipping_options: [{ shipping_rate_data: { type: 'fixed_amount', display_name: `Tracked & insured delivery — ${ZONES[zone].name}`, fixed_amount: { amount: shipping, currency: 'gbp' } } }],
    phone_number_collection: { enabled: true },
    payment_intent_data: { application_fee_amount: feeP, metadata: meta, description: item.name.slice(0, 200) },
    metadata: meta,
    success_url: `${origin}/?order={CHECKOUT_SESSION_ID}#thanks`,
    cancel_url: `${origin}/${back}`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    locale: 'en-GB',
  };
  // Shows the buyer prices in their own currency (Stripe sets the rate). Turn on after testing.
  if (env.STRIPE_ADAPTIVE_PRICING === '1') params.adaptive_pricing = { enabled: true };
  if (frame === 'help' && item.kind === 'original') params.custom_text = { submit: { message: 'Valentyna will email you 2–3 frame ideas with photos. You only pay for a frame if you choose one.' } };

  try {
    const s = await stripe(env, 'POST', 'checkout/sessions', params, shop.account);
    return json({ url: s.url });
  } catch (e) {
    console.log('checkout error', e.message);
    return err(502, 'Payment page could not be opened. Please try again in a minute.');
  }
};
