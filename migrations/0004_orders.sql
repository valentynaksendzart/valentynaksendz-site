-- Online shop (Stripe Connect). Mirrored in lib/schema.js, which creates these automatically.
CREATE TABLE IF NOT EXISTS orders (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id     TEXT UNIQUE NOT NULL,   -- Stripe Checkout session
  payment_intent TEXT,
  account        TEXT,                   -- Valentyna's connected Stripe account
  sku            TEXT NOT NULL,
  kind           TEXT NOT NULL,          -- original | print_paper | print_canvas | card
  painting_id    INTEGER,
  product_id     INTEGER,
  title          TEXT NOT NULL DEFAULT '',
  frame          TEXT,
  zone           TEXT,
  product_p      INTEGER NOT NULL DEFAULT 0,  -- painting/print/card + frame, pence
  shipping_p     INTEGER NOT NULL DEFAULT 0,
  fee_p          INTEGER NOT NULL DEFAULT 0,  -- platform fee (3% of product_p)
  total          INTEGER NOT NULL DEFAULT 0,  -- what the buyer paid, in `currency` minor units
  currency       TEXT NOT NULL DEFAULT 'gbp',
  buyer_name     TEXT,
  buyer_email    TEXT,
  buyer_phone    TEXT,
  address        TEXT,                   -- JSON
  status         TEXT NOT NULL DEFAULT 'paid',  -- paid | partly_refunded | refunded
  problem        TEXT,                   -- e.g. original already sold (refund needed)
  refunded_p     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS orders_pi ON orders(payment_intent);
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
