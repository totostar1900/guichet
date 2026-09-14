-- Guichet · file d'entrée (« À valider »)
-- Sources reçues (e-mail, PDF, photo, texte), brouillon extrait, décision du desk.

create type intake_source as enum ('mail','pdf','photo','texte');
create type intake_state as enum ('a_valider','publie','bloque','rejete');

create table intake_items (
  id            uuid primary key default gen_random_uuid(),
  source        intake_source not null,
  title         text not null,
  from_label    text not null default '',
  received_at   timestamptz not null default now(),
  state         intake_state not null default 'a_valider',
  file_name     text,                 -- clé dans le bucket "sources"
  mime_type     text,
  raw_text      text,                 -- e-mail collé / texte extrait, pour l'aperçu
  draft         jsonb not null default '{"confidence":{},"official":false,"remarks":[]}',
  offer_id      text references offers(id) on delete set null,
  published_at  timestamptz,
  extracted_in  integer,              -- secondes
  notes         text,
  created_by    uuid,                 -- auth.users.id
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index intake_state_received on intake_items (state, received_at desc);
create trigger intake_touch before update on intake_items for each row execute function touch_updated_at();

alter table intake_items enable row level security;
create policy "intake : desk seulement" on intake_items for all using (is_desk()) with check (is_desk());

-- Bucket privé pour les originaux (PDF, photos). Le serveur y accède avec la clé service role.
insert into storage.buckets (id, name, public) values ('sources', 'sources', false)
on conflict (id) do nothing;
create policy "sources : desk lit" on storage.objects for select using (bucket_id = 'sources' and is_desk());
create policy "sources : desk écrit" on storage.objects for insert with check (bucket_id = 'sources' and is_desk());
