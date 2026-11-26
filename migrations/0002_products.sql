-- Greeting cards (and later other products), each with its own SKU.
-- Mirrored in lib/schema.js, which creates it automatically.
CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  sku         TEXT UNIQUE,
  kind        TEXT NOT NULL DEFAULT 'card' CHECK (kind IN ('card')),
  painting_id INTEGER REFERENCES paintings(id) ON DELETE CASCADE,
  format      TEXT NOT NULL DEFAULT '',
  price_p     INTEGER,
  stock       INTEGER NOT NULL DEFAULT 0,
  sold        INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','available')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS products_painting ON products(painting_id);
