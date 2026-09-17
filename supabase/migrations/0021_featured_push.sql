-- À la une (sélection du desk) et notifications push.
alter table offers add column if not exists featured jsonb;

create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  endpoint    text not null unique,
  keys        jsonb not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  last_ok_at  timestamptz,
  failures    integer not null default 0
);
create index if not exists push_subscriptions_user on push_subscriptions (user_id);
alter table push_subscriptions enable row level security;
create policy "push : soi" on push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "push : desk lit" on push_subscriptions for select using (is_desk());
