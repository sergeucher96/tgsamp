-- ============================================================
-- Миграция: ассортимент бизнеса (business_products)
--
-- Логика:
--   наличие строки в business_products = бизнес УМЕЕТ производить этот товар
--   (настраивает админ в "Товары бизнеса")
--
--   enabled = владелец бизнеса сейчас ПРОДАЁТ этот товар
--   (переключает у себя во вкладке "Ассортимент")
--
--   Новые товары, добавленные админом, создаются с enabled = false:
--   владелец сам решает, что выставить на продажу.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Недостающие колонки (живая таблица создана старым скриптом)
-- ------------------------------------------------------------
alter table business_products
  add column if not exists created_at timestamptz default now();

alter table business_products
  add column if not exists updated_at timestamptz default now();

-- Новые товары по умолчанию выключены: решение о продаже принимает владелец
alter table business_products
  alter column enabled set default false;

-- ------------------------------------------------------------
-- 2. Чистка данных
-- ------------------------------------------------------------

-- 2.1 Удаляем полные дубликаты (оставляем самую раннюю строку).
--     Нужно до создания уникального индекса.
delete from business_products a
using business_products b
where a.id > b.id
  and a.business_id = b.business_id
  and a.product_id = b.product_id;

-- 2.2 'shop_24_7' не является локацией (локации: shop_1..shop_5).
--     Локация shop_1 называется "Магазин 24/7" — переносим товары туда.
--     Что уже есть в shop_1 — не трогаем (NOT EXISTS).
insert into business_products (business_id, business_type, product_id, product_name, icon, price, resources, enabled)
select 'shop_1', 'shop', product_id, product_name, icon, price, resources, enabled
from business_products src
where src.business_id = 'shop_24_7'
  and not exists (
    select 1 from business_products t
    where t.business_id = 'shop_1' and t.product_id = src.product_id
  );

delete from business_products where business_id = 'shop_24_7';

-- 2.3 Мусорные ключи из SHOPS_DATABASE, которых нет среди локаций
delete from business_products where business_id in ('', 'hardware_store');

-- 2.4 Страховка: пустая строка в product_id тоже недопустима
delete from business_products where product_id is null or product_id = '';

-- ------------------------------------------------------------
-- 3. Уникальность: один товар — одна строка на бизнес
-- ------------------------------------------------------------
create unique index if not exists idx_business_products_unique
  on business_products(business_id, product_id);

create index if not exists idx_business_products_id
  on business_products(business_id);

create index if not exists idx_business_products_type
  on business_products(business_type);

-- Индекс для выборки продаваемого: WHERE enabled = true
create index if not exists idx_business_products_enabled
  on business_products(business_id) where enabled;

-- ------------------------------------------------------------
-- 4. Автообновление updated_at
-- ------------------------------------------------------------
create or replace function business_products_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_business_products_updated_at on business_products;
create trigger trg_business_products_updated_at
  before update on business_products
  for each row execute function business_products_set_updated_at();

-- ------------------------------------------------------------
-- 5. Заполняем created_at у старых строк
-- ------------------------------------------------------------
update business_products set created_at = now() where created_at is null;
update business_products set updated_at = now() where updated_at is null;
