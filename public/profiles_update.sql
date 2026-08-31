-- Добавление полей для системы организаций в таблицу profiles
alter table profiles add column if not exists organization_id text;
alter table profiles add column if not exists organization_rank text;
-- Массив ID транспортных средств к которым игрок имеет доступ
alter table profiles add column if not exists vehicle_access bigint[];

-- Индексы для быстрого поиска
create index if not exists idx_profiles_org on profiles(organization_id);
create index if not exists idx_profiles_org_rank on profiles(organization_rank);