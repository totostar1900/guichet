-- Lines a client follows: one row per (client, offer); the snapshot is what the
-- client was last told, so the daily alert only fires on a change.
create table if not exists watchlist (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  offer_id     text not null references offers(id) on delete cascade,
  last_hero    text,
  last_status  text,
  alerted_at   timestamptz,
  created_at   timestamptz not null default now(),
  unique (user_id, offer_id)
);
alter table watchlist enable row level security;
create policy "suivi : les siens" on watchlist for select using (user_id = auth.uid() or is_desk());
create policy "suivi : créer les siens" on watchlist for insert with check (user_id = auth.uid());
create policy "suivi : retirer les siens" on watchlist for delete using (user_id = auth.uid());
