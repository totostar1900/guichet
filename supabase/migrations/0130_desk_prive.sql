-- DONNÉES DU DESK QUE LE CLIENT NE LIT JAMAIS (14 novembre 2026).
--
-- La table « reference » est en lecture publique : n'importe qui avec la clef publique peut la lire. Elle convient à ce que le
-- client lit déjà (types, glossaire, barème de ce qu'il paie). Elle ne convient PAS à ce que la maison reçoit d'un partenaire ou
-- d'un émetteur, ni à un relevé du compte global chez un gestionnaire : ceux-là vivent ici, lisibles et modifiables par le desk seul.
create table if not exists desk_prive (
  kind        text not null,
  key         text not null,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  text,
  primary key (kind, key)
);
alter table desk_prive enable row level security;
create policy "desk_prive : desk seul" on desk_prive for all using (is_desk()) with check (is_desk());
