-- Desk-editable reference data: product types, bond schedules, listed companies,
-- bond issuers, glossary. One row per (kind, key), the record itself as JSON.
create table if not exists reference (
  kind        text not null,
  key         text not null,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  text,
  primary key (kind, key)
);
alter table reference enable row level security;
create policy "reference : lecture publique" on reference for select using (true);
create policy "reference : ecriture desk" on reference for all using (is_desk()) with check (is_desk());
-- Offers carry the product type they were published under, and its free facts.
alter table offers add column if not exists type_key text;
alter table offers add column if not exists extra jsonb;
