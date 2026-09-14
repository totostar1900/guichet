-- Guichet · données de marché ingérées depuis le Bulletin Officiel de la Cote (BVMAC)

create table market_bulletins (
  session_date        date primary key,
  number              integer not null,
  source_url          text,
  file_key            text,
  ingested_at         timestamptz not null default now(),
  ingested_by         text not null default 'cron',
  status              text not null default 'ok',
  index_value         numeric(18,3),
  index_variation_pct numeric(9,3),
  counts              jsonb not null default '{}'::jsonb,
  warnings            text[] not null default '{}',
  anomalies           text[] not null default '{}',
  notices             text[] not null default '{}'
);

create table quotes (
  isin               text not null,
  session_date       date not null,
  bulletin_no        integer not null,
  instrument         text not null,
  mnemo              text not null,
  issuer             text not null,
  designation        text not null,
  segment            text,
  previous_close     numeric(18,3) not null,
  previous_date      date not null,
  open               numeric(18,3) not null,
  close              numeric(18,3) not null,
  threshold_high     numeric(18,3) not null,
  threshold_low      numeric(18,3) not null,
  variation_pct      numeric(9,3) not null,
  reference_next     numeric(18,3) not null,
  volume_traded      integer not null default 0,
  value_traded       numeric(18,2) not null default 0,
  trades             integer not null default 0,
  status             text not null default '',
  nominal_remaining  numeric(18,3),
  accrued_coupon     numeric(18,3),
  ytd_variation_pct  numeric(9,3),
  primary key (isin, session_date)
);
create index quotes_isin_date on quotes (isin, session_date desc);

create table fund_navs (
  fund_key                 text not null,
  nav_date                 date not null,
  name                     text not null,
  manager                  text not null,
  depositary               text not null,
  category                 text not null,
  frequency                text not null,
  nav                      numeric(18,2) not null,
  previous_nav             numeric(18,2),
  previous_date            date,
  nav_origin               numeric(18,2) not null,
  inception_date           date not null,
  perf_since_inception_pct numeric(9,3) not null,
  variation_pct            numeric(9,3),
  variation_monthly_pct    numeric(9,3),
  variation_quarterly_pct  numeric(9,3),
  bulletin_no              integer not null,
  session_date             date not null,
  primary key (fund_key, nav_date)
);
create index fund_navs_key_date on fund_navs (fund_key, nav_date desc);

create view latest_quotes as
  select distinct on (isin) * from quotes order by isin, session_date desc;
create view latest_fund_navs as
  select distinct on (fund_key) * from fund_navs order by fund_key, nav_date desc;

-- Quotes and NAVs are public market data: readable by every signed-in user, written by the desk / the cron (service role).
alter table market_bulletins enable row level security;
alter table quotes enable row level security;
alter table fund_navs enable row level security;
create policy "bulletins : lecture" on market_bulletins for select using (auth.role() = 'authenticated');
create policy "bulletins : desk" on market_bulletins for all using (is_desk()) with check (is_desk());
create policy "cotations : lecture" on quotes for select using (auth.role() = 'authenticated');
create policy "cotations : desk" on quotes for all using (is_desk()) with check (is_desk());
create policy "vl : lecture" on fund_navs for select using (auth.role() = 'authenticated');
create policy "vl : desk" on fund_navs for all using (is_desk()) with check (is_desk());

-- Provenance of a listed line's price: 'boc' (ingested) or 'desk' (typed as a fallback).
alter table offers add column if not exists price_source text;
alter table offers add column if not exists hidden boolean not null default false;
