-- Diptychs / triptychs: one artwork painted on several canvases, sold as one set.
-- width_cm / height_cm stay the size of ONE panel; gap_cm = recommended space between panels on the wall.
-- lib/schema.js adds these automatically to an existing table.
ALTER TABLE paintings ADD COLUMN panels INTEGER NOT NULL DEFAULT 1;
ALTER TABLE paintings ADD COLUMN gap_cm REAL;
