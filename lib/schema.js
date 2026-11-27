// Creates the tables on first use, so a fresh D1 database needs no manual setup.
// Keep in sync with migrations/0001_init.sql.
let ready = null;

const SQL = [
  `CREATE TABLE IF NOT EXISTS paintings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE,
    title TEXT NOT NULL DEFAULT '',
    theme TEXT NOT NULL DEFAULT 'wildflowers',
    width_cm REAL,
    height_cm REAL,
    depth_cm REAL,
    medium TEXT NOT NULL DEFAULT 'Oil',
    support TEXT NOT NULL DEFAULT 'Linen canvas',
    year INTEGER,
    price INTEGER,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','available','sold')),
    sold_at TEXT,
    sold_price INTEGER,
    story TEXT NOT NULL DEFAULT '',
    story_ru TEXT NOT NULL DEFAULT '',
    reel_url TEXT,
    prints_edition INTEGER NOT NULL DEFAULT 10,
    print_paper_price INTEGER,
    print_paper_sold INTEGER NOT NULL DEFAULT 0,
    print_canvas_price INTEGER,
    print_canvas_sold INTEGER NOT NULL DEFAULT 0,
    photos TEXT NOT NULL DEFAULT '[]',
    sort INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS paintings_status ON paintings(status)`,
  // Things sold besides originals and prints. For now only greeting cards (kind 'card').
  // One row per product, with its own SKU, so a checkout can work from one list.
  `CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT UNIQUE,
    kind TEXT NOT NULL DEFAULT 'card' CHECK (kind IN ('card')),
    painting_id INTEGER REFERENCES paintings(id) ON DELETE CASCADE,
    format TEXT NOT NULL DEFAULT '',
    price_p INTEGER,
    stock INTEGER NOT NULL DEFAULT 0,
    sold INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','available')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS products_painting ON products(painting_id)`,
  // Online shop: one row per paid Stripe Checkout session (created by the webhook).
  `CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    payment_intent TEXT,
    account TEXT,
    sku TEXT NOT NULL,
    kind TEXT NOT NULL,
    painting_id INTEGER,
    product_id INTEGER,
    title TEXT NOT NULL DEFAULT '',
    frame TEXT,
    zone TEXT,
    product_p INTEGER NOT NULL DEFAULT 0,
    shipping_p INTEGER NOT NULL DEFAULT 0,
    fee_p INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'gbp',
    buyer_name TEXT,
    buyer_email TEXT,
    buyer_phone TEXT,
    address TEXT,
    status TEXT NOT NULL DEFAULT 'paid',
    problem TEXT,
    refunded_p INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS orders_pi ON orders(payment_intent)`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

// Columns added after the first release: add them to an existing table once.
const ADDED = { paintings: { depth_cm: 'REAL' } };
let envRef = null;
async function addColumns() {
  for (const [table, cols] of Object.entries(ADDED)) {
    const { results } = await envRef.DB.prepare(`PRAGMA table_info(${table})`).all();
    const have = new Set(results.map((r) => r.name));
    for (const [c, type] of Object.entries(cols)) if (!have.has(c)) await envRef.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${c} ${type}`).run();
  }
}

export function ensureSchema(env) {
  envRef = env;
  if (!ready) {
    ready = env.DB.batch(SQL.map((s) => env.DB.prepare(s))).then(addColumns).catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}
