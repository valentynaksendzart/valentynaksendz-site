-- Painting style shown on the site (e.g. "Floral art"); empty = the theme's default.
-- lib/schema.js adds it automatically to an existing table.
ALTER TABLE paintings ADD COLUMN style TEXT NOT NULL DEFAULT '';
