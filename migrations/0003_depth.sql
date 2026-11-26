-- Stretcher depth of each painting in cm (e.g. 1.8 or 3.5), shown in the 3D view.
-- lib/schema.js adds it automatically to an existing table.
ALTER TABLE paintings ADD COLUMN depth_cm REAL;
