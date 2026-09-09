-- ============================================================
-- Миграция: Система износа автомобилей
-- Добавляет колонки пробегов и износа 9 систем
-- ============================================================

-- 1. Пробег
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS mileage INTEGER DEFAULT 0;

-- 2. Накопленный износ каждой системы (в км)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS wear_oil       INTEGER DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS wear_tires     INTEGER DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS wear_brakes    INTEGER DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS wear_cooling   INTEGER DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS wear_battery   INTEGER DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS wear_electric  INTEGER DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS wear_suspension INTEGER DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS wear_transmission INTEGER DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS wear_engine    INTEGER DEFAULT 0;

-- 3. Общее состояние (0-100), рассчитывается из систем
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS condition      INTEGER DEFAULT 100;

-- 4. Счётчик ремонтов
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS repair_count   INTEGER DEFAULT 0;