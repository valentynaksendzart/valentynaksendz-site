// Minimal Stripe client for Workers: form-encoded fetch + webhook signature check. No SDK needed.

function encode(obj, prefix, out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object') encode(v, key, out);
    else out.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(v)));
  }
  return out;
}
export const form = (obj) => encode(obj).join('&');

// account: connected account id (acct_...) to act on its behalf (direct charges).
export async function stripe(env, method, path, params, account) {
  const headers = { authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'stripe-version': '2024-06-20' };
  if (account) headers['stripe-account'] = account;
  let url = 'https://api.stripe.com/v1/' + path;
  let body;
  if (params && method === 'GET') url += '?' + form(params);
  else if (params) {
    body = form(params);
    headers['content-type'] = 'application/x-www-form-urlencoded';
  }
  const res = await fetch(url, { method, headers, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error((data.error && data.error.message) || 'Stripe ' + res.status);
    e.status = res.status;
    throw e;
  }
  return data;
}

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Checks the Stripe-Signature header; returns the parsed event or throws.
export async function verifyWebhook(rawBody, header, secret, toleranceSec = 300) {
  const v1 = [];
  let t = null;
  for (const p of String(header || '').split(',')) {
    const [k, v] = p.split('=');
    if (k === 't') t = v;
    if (k === 'v1') v1.push(v);
  }
  if (!t || !v1.length) throw new Error('no signature');
  if (Math.abs(Date.now() / 1000 - Number(t)) > toleranceSec) throw new Error('too old');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${rawBody}`)));
  if (!v1.some((s) => safeEqual(s, sig))) throw new Error('bad signature');
  return JSON.parse(rawBody);
}
