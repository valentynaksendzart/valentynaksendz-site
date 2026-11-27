// Stripe sends events here (set up as a Connect webhook: "events on connected accounts").
// A paid checkout becomes an order, and the stock goes down:
//   original -> marked sold; print -> one more of the edition sold; card -> one more sold.
// A refund marks the order refunded and gives back Valentin's 3% in the same proportion.
import { json, err } from '../../../lib/util.js';
import { ensureSchema } from '../../../lib/schema.js';
import { stripe, verifyWebhook } from '../../../lib/stripe.js';
import { getSetting } from '../../../lib/shop.js';

const int = (v) => Math.max(0, Math.round(Number(v) || 0));

async function recordPaid(env, s) {
  if (s.payment_status !== 'paid') return; // async methods arrive later as async_payment_succeeded
  const m = s.metadata || {};
  const ship = (s.collected_information && s.collected_information.shipping_details) || s.shipping_details || {};
  const cust = s.customer_details || {};
  const ins = await env.DB.prepare(`INSERT INTO orders
    (session_id, payment_intent, account, sku, kind, painting_id, product_id, title, frame, zone,
     product_p, shipping_p, fee_p, total, currency, buyer_name, buyer_email, buyer_phone, address)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(session_id) DO NOTHING RETURNING id`).bind(
    s.id, s.payment_intent || null, s._account || null, m.sku || '', m.kind || '',
    m.painting_id ? Number(m.painting_id) : null, m.product_id ? Number(m.product_id) : null,
    m.title || '', m.frame || null, m.zone || null,
    int(m.product_p), int(m.shipping_p), int(m.fee_p), int(s.amount_total), s.currency || 'gbp',
    ship.name || cust.name || null, cust.email || null, cust.phone || null,
    JSON.stringify(ship.address || cust.address || null)
  ).first();
  if (!ins) return; // already handled (Stripe can send an event twice)

  let changed;
  const pid = Number(m.painting_id);
  if (m.kind === 'original') {
    changed = await env.DB.prepare(
      "UPDATE paintings SET status = 'sold', sold_at = datetime('now'), sold_price = ?, updated_at = datetime('now') WHERE id = ? AND status = 'available'"
    ).bind(Math.round(int(m.product_p) / 100), pid).run();
    if (!changed.meta.changes) await problem(env, ins.id, 'Оригинал уже был продан раньше: нужно вернуть деньги покупателю.');
  } else if (m.kind === 'print_paper' || m.kind === 'print_canvas') {
    const col = m.kind === 'print_paper' ? 'print_paper_sold' : 'print_canvas_sold';
    changed = await env.DB.prepare(
      `UPDATE paintings SET ${col} = ${col} + 1, updated_at = datetime('now') WHERE id = ? AND ${col} < prints_edition`
    ).bind(pid).run();
    if (!changed.meta.changes) await problem(env, ins.id, 'Тираж уже распродан: нужно вернуть деньги покупателю.');
  } else if (m.kind === 'card') {
    changed = await env.DB.prepare(
      "UPDATE products SET sold = sold + 1, updated_at = datetime('now') WHERE id = ? AND sold < stock"
    ).bind(Number(m.product_id)).run();
    if (!changed.meta.changes) await problem(env, ins.id, 'Открытки закончились: нужно вернуть деньги или допечатать.');
  }
}

const problem = (env, id, text) => env.DB.prepare('UPDATE orders SET problem = ? WHERE id = ?').bind(text, id).run();

async function recordRefund(env, ch) {
  if (!ch.payment_intent) return;
  const status = ch.refunded ? 'refunded' : 'partly_refunded';
  await env.DB.prepare('UPDATE orders SET status = ?, refunded_p = ? WHERE payment_intent = ?')
    .bind(status, int(ch.amount_refunded), ch.payment_intent).run();
  // Give back the platform fee in the same share as the refund (Valentin agreed to this).
  if (!ch.application_fee || !ch.amount) return;
  const feeId = typeof ch.application_fee === 'string' ? ch.application_fee : ch.application_fee.id;
  const f = await stripe(env, 'GET', 'application_fees/' + feeId);
  const target = Math.round((f.amount * ch.amount_refunded) / ch.amount);
  const diff = Math.min(target, f.amount) - f.amount_refunded;
  if (diff > 0) await stripe(env, 'POST', `application_fees/${feeId}/refunds`, { amount: diff });
}

export const onRequestPost = async ({ request, env }) => {
  if (!env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY) return err(503, 'not configured');
  const raw = await request.text();
  let event;
  try {
    event = await verifyWebhook(raw, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return err(400, 'bad signature');
  }
  await ensureSchema(env);
  // Only accept events from Valentyna's connected account.
  const account = await getSetting(env, 'stripe_account');
  if (event.account && account && event.account !== account) return json({ ignored: 'other account' });

  const obj = event.data && event.data.object;
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    await recordPaid(env, { ...obj, _account: event.account });
  } else if (event.type === 'charge.refunded') {
    await recordRefund(env, obj);
  }
  return json({ received: true });
};
