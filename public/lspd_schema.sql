-- Таблица членства в LSPD
-- Создайте эту таблицу в Supabase SQL Editor

create table lspd_members (
  id bigint primary key generated always as identity,
  player_id uuid not null unique references profiles(id),
  rank text not null default 'Patrolman',
  in_uniform boolean not null default false,
  reputation int not null default 0,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Индекс по player_id для быстрого поиска
create index idx_lspd_members_player_id on lspd_members(player_id);

-- RLS политики
alter table lspd_members enable row level security;

create policy "LSPD members can view own record"
  on lspd_members for select
  using (auth.uid()::text = (select telegram_id from profiles where profiles.id = lspd_members.player_id));

-- ==========================================
-- Таблица камер наблюдения LSPD
-- ==========================================
create table lspd_cameras (
  id bigint primary key generated always as identity,
  location_id text not null,
  location_name text not null,
  player_id uuid not null references lspd_members(player_id),
  installed_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 hours'),
  created_at timestamptz not null default now()
);

create index idx_lspd_cameras_location on lspd_cameras(location_id);
create index idx_lspd_cameras_player on lspd_cameras(player_id);
create index idx_lspd_cameras_expires on lspd_cameras(expires_at);

alter table lspd_cameras enable row level security;

create policy "LSPD cameras visible to all members"
  on lspd_cameras for select
  using (true);