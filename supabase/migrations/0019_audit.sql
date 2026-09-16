-- Piste d'audit structurée, historique des versions, approbations (quatre yeux).

-- ---------- Audit : qui, quoi, avant, après, pourquoi, d'où ; chaîné par hachage, immuable ----------
create table if not exists audit (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  actor       text not null,            -- nom ou e-mail ; « système » pour les crons
  actor_id    uuid,                     -- auth.users.id si connu
  action      text not null,            -- offer.publish, offer.quote, intent.transition, reference.upsert, staff.role…
  entity      text not null,            -- offer, intent, reference, profile, approval
  entity_id   text not null,
  before      jsonb,
  after       jsonb,
  reason      text,
  ip          text,
  user_agent  text,
  prev_hash   text,
  hash        text not null
);
create index if not exists audit_entity on audit (entity, entity_id, at desc);
create index if not exists audit_at on audit (at desc);
alter table audit enable row level security;
create policy "audit : desk lit" on audit for select using (is_desk());
-- Personne ne modifie ni n'efface une ligne d'audit (le déclencheur s'applique aussi à la clé service).
create or replace function audit_immutable() returns trigger language plpgsql as $$
begin
  raise exception 'La piste d''audit est immuable';
end $$;
drop trigger if exists audit_immutable on audit;
create trigger audit_immutable before update or delete on audit for each row execute function audit_immutable();

-- ---------- Versions : la fiche complète telle que publiée, pour comparer et restaurer ----------
alter table offer_versions add column if not exists snapshot jsonb;
alter table offer_versions add column if not exists published_by_name text;
alter table offer_versions add column if not exists note text;

-- ---------- Approbations : ce qu'un opérateur propose hors de sa fenêtre déléguée ----------
create table if not exists approvals (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null,           -- offer_publish, offer_quote
  entity_id     text not null,           -- offer id
  title         text not null,
  payload       jsonb not null,          -- the offer as it would be written
  reason        text not null,           -- why the rule fired
  requested_by  text not null,
  requested_at  timestamptz not null default now(),
  decided_by    text,
  decided_at    timestamptz,
  decision      text,                    -- approuve | refuse
  note          text
);
create index if not exists approvals_open on approvals (decided_at) where decided_at is null;
alter table approvals enable row level security;
create policy "approbations : desk" on approvals for all using (is_desk()) with check (is_desk());
