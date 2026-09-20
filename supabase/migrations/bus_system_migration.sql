-- ============================================================
-- Миграция: Система автобусных маршрутов и остановок
-- ============================================================

-- 1. Таблица остановок (bus_stops)
CREATE TABLE IF NOT EXISTS bus_stops (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  waypoint_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Таблица маршрутов (bus_routes)
CREATE TABLE IF NOT EXISTS bus_routes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  stops TEXT[] NOT NULL,
  bus_stops JSONB DEFAULT '{}',
  description TEXT DEFAULT '',
  pay INTEGER DEFAULT 500,
  exp INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_bus_routes_code ON bus_routes(code);
CREATE INDEX IF NOT EXISTS idx_bus_stops_waypoint ON bus_stops(waypoint_id);

-- 3. Базовые маршруты
INSERT INTO bus_routes (code, name, stops, bus_stops, description, pay, exp)
VALUES
  ('route_1', 'Центральный круг', ARRAY['404','405','406','254','407','408','330','409','329','410','411','383','403','404'], '{}', 'Центр города через главные магистрали', 750, 10),
  ('route_2', 'Западный экспресс', ARRAY['373','374','375','376','107','377','378','379','380','381','382','308','383','396','395','309','394','393','378','377','376','375','374','373'], '{}', 'Западный район промышленных зон', 1000, 15),
  ('route_3', 'Южный маршрут', ARRAY['350','351','352','353','354','355','356','288','357','358','359','360','361','291','362','363','364','365','279','196','197','198','279','281','280','279','291','361','360','359','358','357','288','356','355','354','353','352','351','350'], '{}', 'Юг города — длинные расстояния, высокая оплата', 1250, 20),
  ('route_4', 'Восточная петля', ARRAY['466','467','468','469','470','471','472','468','467','466'], '{}', 'Короткий маршрут восточного района', 650, 8)
ON CONFLICT (code) DO NOTHING;

