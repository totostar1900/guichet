-- Guichet · schéma initial
-- Offres, versions de prix, intentions, journal d'événements.
-- Appliquer dans le SQL Editor de Supabase (ou `supabase db push`).

create extension if not exists "pgcrypto";

-- ---------- énumérations ----------
create type offer_kind as enum ('OTA','BTA','ACTIONS','APE','RACHAT');
create type offer_operation as enum ('nouvelle_ligne','abondement','rachat','ipo','emprunt_ape');
create type offer_status as enum ('draft','published','results','live','matured','withdrawn');
create type intent_type as enum ('appetit','ferme','info','rappel','cession');
create type intent_state as enum ('recue','confirmee','transmise','servie','non_servie','reglee','annulee');
create type channel as enum ('WhatsApp','Appel','E-mail');
create type event_kind as enum ('intent','desk','system','document');

-- ---------- offres ----------
create table offers (
  id                text primary key,
  kind              offer_kind not null,
  operation         offer_operation not null,
  country           text not null,
  country_name      text not null,
  issuer            text not null,
  title             text not null,
  isin              text not null,
  status            offer_status not null default 'draft',
  is_example        boolean not null default false,
  blurb             text not null default '',
  documents         jsonb not null default '[]',

  opens_at          timestamptz not null,
  deadline_at       timestamptz not null,
  results_at        timestamptz,
  settle_on         date not null,
  maturity_on       date,
  last_coupon_on    date,                       -- null = ligne nouvelle

  nominal           numeric(18,2) not null,
  coupon_rate       numeric(6,3),               -- % p.a. (OTA / APE)
  precount_rate     numeric(6,3),               -- % (BTA)
  price_pct         numeric(7,3),               -- prix Purpose, % du nominal
  price_note        text,
  rate_note         text,
  served_price_pct  numeric(7,3),
  commission_pct    numeric(5,3) not null default 0.5,
  min_titles        integer,
  size_label        text,

  price_per_share   numeric(18,2),
  min_shares        integer,
  shares_offered    bigint,
  dividend_per_share numeric(18,2),
  last_price        numeric(18,2),
  last_price_on     date,

  version           integer not null default 0,
  priced_at         timestamptz,
  result_line       text,

  source_ref        text,                       -- n° du communiqué
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index offers_status_deadline on offers (status, deadline_at);

-- Historique des prix publiés (une ligne par publication)
create table offer_versions (
  id              uuid primary key default gen_random_uuid(),
  offer_id        text not null references offers(id) on delete cascade,
  version         integer not null,
  price_pct       numeric(7,3),
  precount_rate   numeric(6,3),
  commission_pct  numeric(5,3) not null,
  min_titles      integer,
  published_by    uuid,                          -- auth.users.id (desk)
  published_at    timestamptz not null default now(),
  unique (offer_id, version)
);

-- ---------- intentions ----------
create sequence intent_seq;
create or replace function next_intent_seq() returns integer
language sql volatile as $$ select nextval('intent_seq')::integer $$;

create table intents (
  id              uuid primary key default gen_random_uuid(),
  ref             text not null unique,          -- PF-0914-011
  offer_id        text not null references offers(id),
  offer_version   integer not null,
  client_id       uuid,                          -- clients.id (étape onboarding)
  client_name     text not null,
  client_segment  text not null default '',
  type            intent_type not null,
  amount          numeric(18,2),                 -- FCFA, ou titres pour une cession
  channel         channel not null,
  message         text,
  state           intent_state not null default 'recue',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index intents_offer on intents (offer_id, state);
create index intents_created on intents (created_at desc);

-- ---------- journal ----------
create table events (
  id          uuid primary key default gen_random_uuid(),
  at          timestamptz not null default now(),
  kind        event_kind not null,
  html        text not null,
  intent_id   uuid references intents(id) on delete set null,
  offer_id    text references offers(id) on delete set null,
  actor       uuid                                -- auth.users.id si connu
);
create index events_at on events (at desc);

-- ---------- updated_at ----------
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger offers_touch before update on offers for each row execute function touch_updated_at();
create trigger intents_touch before update on intents for each row execute function touch_updated_at();

-- ---------- sécurité (RLS) ----------
-- Lecture publique des offres publiées ; tout le reste réservé au rôle service
-- (le serveur Next utilise la clé service role) jusqu'à l'arrivée de l'auth.
alter table offers enable row level security;
alter table offer_versions enable row level security;
alter table intents enable row level security;
alter table events enable row level security;

create policy "offres publiées visibles" on offers
  for select using (status <> 'draft');

-- Realtime : le desk s'abonne aux nouvelles intentions et événements
alter publication supabase_realtime add table intents, events;
