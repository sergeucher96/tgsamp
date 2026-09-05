-- ==========================================
-- Territory bounding box migration
-- Run this if territories table already exists
-- ==========================================

ALTER TABLE territories ADD COLUMN IF NOT EXISTS min_x double precision NOT NULL DEFAULT 0;
ALTER TABLE territories ADD COLUMN IF NOT EXISTS max_x double precision NOT NULL DEFAULT 0;
ALTER TABLE territories ADD COLUMN IF NOT EXISTS min_y double precision NOT NULL DEFAULT 0;
ALTER TABLE territories ADD COLUMN IF NOT EXISTS max_y double precision NOT NULL DEFAULT 0;
ALTER TABLE territories ADD COLUMN IF NOT EXISTS base_income int NOT NULL DEFAULT 0;
ALTER TABLE territories ADD COLUMN IF NOT EXISTS control int NOT NULL DEFAULT 0 CHECK (control >= 0 and control <= 100);
ALTER TABLE territories ADD COLUMN IF NOT EXISTS activity int NOT NULL DEFAULT 0 CHECK (activity >= 0 and activity <= 100);

UPDATE territories SET min_x = 0, max_x = 0, min_y = 0, max_y = 0, base_income = 0, control = 0, activity = 0 WHERE min_x IS NULL OR max_x IS NULL OR min_y IS NULL OR max_y IS NULL OR base_income IS NULL OR control IS NULL OR activity IS NULL;
