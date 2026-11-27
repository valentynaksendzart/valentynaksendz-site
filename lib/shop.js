// Online shop settings: what things cost to send, frame prices, and Valentin's platform fee.
// All amounts are in pence (GBP). Values marked TBC are placeholders until Valentyna confirms them.

// Valentin's share: 3% of the product price only (painting or print plus frame),
// never of shipping, insurance or Stripe's own fees. In basis points: 300 = 3%.
export const PLATFORM_FEE_BPS = 300;

// Frames sold with an original. null = price not set yet, so that frame cannot be bought
// online (the buyer can pick "No frame" or "Help me choose" instead). "help" is free advice.
export const FRAME_PRICES = {
  none: 0,
  help: 0,
  oak: null, // TBC
  black: null, // TBC
  gold: null, // TBC
};
export const FRAME_NAMES = {
  none: 'No frame',
  help: 'Help me choose a frame (free advice)',
  oak: 'Natural oak floating frame',
  black: 'Black floating frame',
  gold: 'Classic gold frame',
};

// Shipping zones match the country list on the painting page (index.html COUNTRIES).
const EU = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];
const ASIA = ['SG','HK','KR','TW','MY','TH','PH','ID','IN','AE','IL','VN'];
export const ZONES = {
  uk: { name: 'United Kingdom', countries: ['GB'] },
  eu: { name: 'Europe (EU)', countries: EU },
  us: { name: 'United States', countries: ['US'] },
  ca: { name: 'Canada', countries: ['CA'] },
  jp: { name: 'Japan', countries: ['JP'] },
  asia: { name: 'Other Asia', countries: ASIA },
  au: { name: 'Australia', countries: ['AU'], noFramed: true },
  nz: { name: 'New Zealand', countries: ['NZ'], noFramed: true },
};

// Tracked, signed-for and insured delivery, per zone and kind. All TBC (placeholders).
// original_framed is used when a frame is chosen (crated, heavier).
export const SHIPPING = {
  uk:   { original: 3500, original_framed: 6000, print: 900,  card: 200 },
  eu:   { original: 6500, original_framed: 12000, print: 1600, card: 350 },
  us:   { original: 8500, original_framed: 16000, print: 2000, card: 400 },
  ca:   { original: 8500, original_framed: 16000, print: 2000, card: 400 },
  jp:   { original: 9500, original_framed: 18000, print: 2200, card: 400 },
  asia: { original: 9500, original_framed: 18000, print: 2200, card: 400 },
  au:   { original: 9500, original_framed: null, print: 2200, card: 400 },
  nz:   { original: 9500, original_framed: null, print: 2200, card: 400 },
};

export const fee = (productPence) => Math.round((productPence * PLATFORM_FEE_BPS) / 10000);

// The shop is open only when every key is set and the owner switched it on.
export async function shopState(env) {
  const account = await getSetting(env, 'stripe_account');
  return {
    keys: !!env.STRIPE_SECRET_KEY,
    clientId: !!env.STRIPE_CLIENT_ID,
    webhook: !!env.STRIPE_WEBHOOK_SECRET,
    account,
    mode: String(env.STRIPE_SECRET_KEY || '').startsWith('sk_live') ? 'live' : 'test',
    open: env.SHOP_OPEN === '1' && !!env.STRIPE_SECRET_KEY && !!env.STRIPE_WEBHOOK_SECRET && !!account,
  };
}

export async function getSetting(env, key) {
  const r = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
  return r ? r.value : null;
}
export async function setSetting(env, key, value) {
  if (value == null) return env.DB.prepare('DELETE FROM settings WHERE key = ?').bind(key).run();
  return env.DB.prepare(
    "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
  ).bind(key, String(value)).run();
}
