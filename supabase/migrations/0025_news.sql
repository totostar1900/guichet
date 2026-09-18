-- Actualités : links to what others publish, with the desk's two lines. Only
-- published items are readable by everyone; drafts, received links and
-- discarded items stay with the desk.
create table if not exists news (
  id              text primary key,
  url             text not null,
  domain          text not null,
  title           text not null,
  title_en        text,
  why             text not null default '',
  why_en          text,
  source          text not null,
  format          text,
  published_at    timestamptz not null,
  rubric          text not null,
  links           jsonb not null default '[]'::jsonb,
  featured        boolean not null default false,
  status          text not null default 'brouillon',
  visible_until   date,
  received_from   text,
  note            text,
  page_title      text,
  link_ok         boolean,
  link_checked_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  updated_by      text,
  published_by    text,
  version         integer not null default 1
);
create index if not exists news_published on news (status, published_at desc);
create index if not exists news_url on news (url);
alter table news enable row level security;
create policy "actualites : lecture publique des publiees" on news for select using (status = 'publiee' or is_desk());
create policy "actualites : ecriture desk" on news for all using (is_desk()) with check (is_desk());
