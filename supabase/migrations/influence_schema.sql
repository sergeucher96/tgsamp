-- ==========================================
-- Tracking influence actions for diminishing returns
-- ==========================================

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

drop policy if exists "Territory influence actions visible to all" on territory_influence_actions;
create policy "Territory influence actions visible" on territory_influence_actions for select using (true);

drop policy if exists "Territory influence actions insertable" on territory_influence_actions;
create policy "Territory influence actions insertable" on territory_influence_actions for insert with check (true);

drop policy if exists "Territory influence actions updatable" on territory_influence_actions;
create policy "Territory influence actions updatable" on territory_influence_actions for update using (true);

drop policy if exists "Territory influence actions deletable" on territory_influence_actions;
create policy "Territory influence actions deletable" on territory_influence_actions for delete using (true);
