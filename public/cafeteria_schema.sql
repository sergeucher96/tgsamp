-- ==========================================
-- Столовая: Добавление колонки crop_count в businesses
-- ==========================================

-- Добавляем колонку для хранения урожая на складе столовой
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS crop_count INT NOT NULL DEFAULT 0;

-- Добавляем колонку updated_at если её нет
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Создаём триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_businesses_updated_at ON businesses;
CREATE TRIGGER update_businesses_updated_at
    BEFORE UPDATE ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();