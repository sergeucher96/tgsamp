-- ==========================================
-- Territory system migration
-- Run this entire file in Supabase SQL Editor
-- ==========================================

-- 1. Territory actions table (for diminishing returns)
create table if not exists territory_influence_actions (
  id bigint primary key generated always as identity,
  territory_id bigint not null references territories(id) on delete cascade,
  gang_id text not null references organizations(id),
  reason text not null,
  action_count int not null default 0,
  period_start timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(territory_id, gang_id, reason, period_start)
);

create index if not exists idx_territory_influence_actions_lookup
  on territory_influence_actions(territory_id, gang_id, reason);

alter table territory_influence_actions enable row level security;

drop policy if exists "Territory influence actions visible" on territory_influence_actions;
create policy "Territory influence actions visible" on territory_influence_actions for select using (true);

drop policy if exists "Territory influence actions insertable" on territory_influence_actions;
create policy "Territory influence actions insertable" on territory_influence_actions for insert with check (true);

drop policy if exists "Territory influence actions updatable" on territory_influence_actions;
create policy "Territory influence actions updatable" on territory_influence_actions for update using (true);

drop policy if exists "Territory influence actions deletable" on territory_influence_actions;
create policy "Territory influence actions deletable" on territory_influence_actions for delete using (true);

-- 2. Wars table
create table if not exists wars (
  id bigint primary key generated always as identity,
  territory_id bigint not null references territories(id) on delete cascade,
  attacker_gang_id text not null references organizations(id),
  defender_gang_id text not null references organizations(id),
  status text not null default 'WAR_PREPARATION',
  started_at timestamptz,
  ends_at timestamptz,
  attacker_score int not null default 0,
  defender_score int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_wars_territory on wars(territory_id);
create index if not exists idx_wars_status on wars(status);
create index if not exists idx_wars_gangs on wars(attacker_gang_id, defender_gang_id);

alter table wars enable row level security;

drop policy if exists "Wars visible" on wars;
create policy "Wars visible" on wars for select using (true);

drop policy if exists "Wars insertable" on wars;
create policy "Wars insertable" on wars for insert with check (true);

drop policy if exists "Wars updatable" on wars;
create policy "Wars updatable" on wars for update using (true);

drop policy if exists "Wars deletable" on wars;
create policy "Wars deletable" on wars for delete using (true);

-- 3. War events table
create table if not exists war_events (
  id bigint primary key generated always as identity,
  war_id bigint not null references wars(id) on delete cascade,
  territory_id bigint not null references territories(id) on delete cascade,
  type text not null,
  status text not null default 'ACTIVE',
  attacker_gang_id text not null references organizations(id),
  defender_gang_id text not null references organizations(id),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  result text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_war_events_war on war_events(war_id);
create index if not exists idx_war_events_territory on war_events(territory_id);
create index if not exists idx_war_events_status on war_events(status);

alter table war_events enable row level security;

drop policy if exists "War events visible" on war_events;
create policy "War events visible" on war_events for select using (true);

drop policy if exists "War events insertable" on war_events;
create policy "War events insertable" on war_events for insert with check (true);

drop policy if exists "War events updatable" on war_events;
create policy "War events updatable" on war_events for update using (true);

drop policy if exists "War events deletable" on war_events;
create policy "War events deletable" on war_events for delete using (true);

-- 4. War participants table
create table if not exists war_participants (
  id bigint primary key generated always as identity,
  war_id bigint not null references wars(id) on delete cascade,
  event_id bigint references war_events(id) on delete set null,
  player_id text not null,
  gang_id text not null references organizations(id),
  contribution int not null default 0,
  result text,
  reward jsonb,
  joined_at timestamptz not null default now()
);

create index if not exists idx_war_participants_war on war_participants(war_id);
create index if not exists idx_war_participants_event on war_participants(event_id);
create index if not exists idx_war_participants_player on war_participants(player_id);
create index if not exists idx_war_participants_gang on war_participants(gang_id);

alter table war_participants enable row level security;

drop policy if exists "War participants visible" on war_participants;
create policy "War participants visible" on war_participants for select using (true);

drop policy if exists "War participants insertable" on war_participants;
create policy "War participants insertable" on war_participants for insert with check (true);

drop policy if exists "War participants updatable" on war_participants;
create policy "War participants updatable" on war_participants for update using (true);

drop policy if exists "War participants deletable" on war_participants;
create policy "War participants deletable" on war_participants for delete using (true);
