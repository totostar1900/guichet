-- Guichet · documents générés (bulletins, appels de fonds, bordereaux, avis)

create type document_type as enum ('bulletin','fonds','cession','bordereau','allocation','non_allocation','opere');
create type document_status as enum ('genere','envoye','signe');

create table documents (
  id            uuid primary key default gen_random_uuid(),
  type          document_type not null,
  number        text not null unique,        -- PC-BUL-2026-0001
  title         text not null,
  intent_id     uuid references intents(id) on delete set null,
  offer_id      text references offers(id) on delete set null,
  client_name   text,
  auction_key   text,                        -- bordereau : "<pays>|<deadline>"
  file_key      text not null,               -- objet dans le bucket "sources" (docs/…pdf)
  status        document_status not null default 'genere',
  sent_via      text[],
  sent_at       timestamptz,
  signed_at     timestamptz,
  created_at    timestamptz not null default now(),
  created_by    text
);
create index documents_intent on documents (intent_id);
create index documents_created on documents (created_at desc);

alter table documents enable row level security;
create policy "documents : desk" on documents for all using (is_desk()) with check (is_desk());
create policy "documents : client lit les siens" on documents for select
  using (intent_id in (select id from intents where client_id = auth.uid()));
