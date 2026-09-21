-- The desk's wording of the document models: one row per version of one passage; the code keeps the defaults.
create table if not exists template_texts (
  id           uuid primary key default gen_random_uuid(),
  doc_type     text not null,
  passage      text not null,
  version      integer not null,
  fr           text not null,
  en           text not null default '',
  status       text not null default 'pending',   -- current, pending, superseded
  by_name      text not null,
  at           timestamptz not null default now(),
  note         text,
  approved_by  text,
  approved_at  timestamptz,
  unique (doc_type, passage, version)
);
create index if not exists template_texts_current on template_texts (doc_type, passage) where status = 'current';
alter table template_texts enable row level security;
-- reached through the service role only (the desk's server actions); no direct client access

-- each generated document remembers the version of every reworded passage it carried
alter table documents add column if not exists template_versions jsonb;
