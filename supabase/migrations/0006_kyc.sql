-- Guichet · onboarding, KYC, compte-titres

create type client_kind as enum ('physique','morale','groupement','institutionnel');
create type kyc_status as enum ('brouillon','soumis','en_revue','complements','approuve','refuse');

create table client_files (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references profiles(id) on delete cascade,
  kind          client_kind not null,
  status        kyc_status not null default 'brouillon',
  identity      jsonb not null default '{}',   -- nom, contact, adresse, pièce, NIU, RCCM, forme, règle de décision
  persons       jsonb not null default '[]',   -- représentants, mandataires, bénéficiaires effectifs
  documents     jsonb not null default '[]',   -- {kind, fileKey, fileName, mimeType, uploadedAt, verified}
  funds         jsonb not null default '{"pep":false}',
  profile       jsonb not null default '{"category":"non_professionnel"}',
  consents      jsonb not null default '{}',   -- dataAt, whatsappAt, conventionAt, conventionMethod
  review        jsonb not null default '{}',   -- risk, notes, reviewedBy, reviewedAt, nextReviewOn, custodianAccount, requestedItems
  submitted_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index client_files_status on client_files (status, updated_at desc);
create trigger client_files_touch before update on client_files for each row execute function touch_updated_at();

alter table client_files enable row level security;
create policy "kyc : le client voit et édite son dossier" on client_files
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "kyc : desk" on client_files for all using (is_desk()) with check (is_desk());

-- Pièces KYC : bucket privé distinct des sources d'offres.
insert into storage.buckets (id, name, public) values ('kyc', 'kyc', false) on conflict (id) do nothing;
create policy "kyc files : desk lit" on storage.objects for select using (bucket_id = 'kyc' and is_desk());
create policy "kyc files : client écrit les siens" on storage.objects for insert
  with check (bucket_id = 'kyc' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "kyc files : client lit les siens" on storage.objects for select
  using (bucket_id = 'kyc' and (storage.foldername(name))[1] = auth.uid()::text);

alter type document_type add value if not exists 'convention';
alter type document_type add value if not exists 'dossier_svt';
alter table documents add column if not exists client_file_id uuid references client_files(id) on delete set null;
