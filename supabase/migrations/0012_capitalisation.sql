-- Guichet · capitalisation boursière lue dans le bulletin (actions) et catalogue des documents émetteurs
alter table quotes add column if not exists shares_float bigint;
alter table quotes add column if not exists shares_total bigint;
alter table quotes add column if not exists last_dividend numeric(18,2);
alter table quotes add column if not exists dividend_year integer;
alter table quotes add column if not exists dividend_date date;
alter table quotes add column if not exists liquidity_3m_pct numeric(9,3);
alter table quotes add column if not exists eps numeric(18,2);
alter table quotes add column if not exists market_cap_float numeric(20,0);
alter table quotes add column if not exists market_cap_total numeric(20,0);
-- The view selects * : recreate it so the new columns show.
drop view if exists latest_quotes;
create view latest_quotes as select distinct on (isin) * from quotes order by isin, session_date desc;

-- Documents published by listed companies (états financiers, rapports, fiches), collected from the BVMAC site.
create table issuer_documents (
  id           uuid primary key default gen_random_uuid(),
  mnemo        text not null,
  kind         text not null,           -- etats_ohada | etats_ifrs | rapport_gestion | rapport_semestriel | fiche | note_information | autre
  year         integer,
  title        text not null,
  source_url   text not null unique,
  file_key     text,                    -- copy in the private bucket, when fetched
  bytes        integer,
  has_text     boolean,
  collected_at timestamptz not null default now()
);
create index issuer_documents_mnemo on issuer_documents (mnemo, year desc);
alter table issuer_documents enable row level security;
create policy "documents émetteurs : lecture" on issuer_documents for select using (auth.role() = 'authenticated');
create policy "documents émetteurs : desk" on issuer_documents for all using (is_desk()) with check (is_desk());
