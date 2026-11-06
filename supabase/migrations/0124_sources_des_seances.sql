-- ═══════════════════════════════════════════════════════════════════════════
-- LES DEUX SOURCES D'UNE SÉANCE D'ADJUDICATION : LE COMMUNIQUÉ ET L'EXPORT OJA
--
-- Une séance peut venir du communiqué du Trésor (PDF, lu puis confirmé par le
-- desk) et de l'export OJA (Excel, calculé sur le carnet d'offres). Les
-- colonnes plates de la séance restent la valeur RETENUE, celle que tout le
-- reste de l'application lit. « sources » garde les deux jeux de valeurs côte
-- à côte, le choix de source par champ, les écarts tranchés (valeur écartée,
-- motif, auteur, date), les sources exclues et ce que seul le carnet sait
-- (rejet au prix, nombre d'offres : réservé au desk).
--
-- Pourquoi les deux jeux : le desk doit pouvoir exclure une source, même déjà
-- chargée, et produire des rapports sur l'une ou sur les deux. Une valeur
-- écrasée ne se retrouve plus.
--
-- « oja_imports » est le journal des fichiers importés : de quoi afficher le
-- dernier import, et exclure un import entier au besoin. Les fichiers eux-mêmes
-- ne sont pas gardés : ils portent les comptes acheteurs des spécialistes, qui
-- n'ont aucune raison de quitter le poste du desk.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.auction_results
  add column if not exists sources jsonb;

comment on column public.auction_results.sources is
  'Les deux sources de la séance (pdf, excel), la source retenue par champ, les écarts tranchés et les sources exclues. Vide : la séance est un communiqué.';

create table if not exists oja_imports (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  created_by    text not null,
  -- Un objet par fichier : type (offres, encheres, titres), nom, nombre de lignes.
  fichiers      jsonb not null default '[]'::jsonb,
  plage_du      date,
  plage_au      date,
  seances       integer not null default 0,
  nouvelles     integer not null default 0,
  rapprochees   integer not null default 0,
  concordantes  integer not null default 0,
  ecarts        integer not null default 0,
  ignorees      integer not null default 0,
  -- Un import exclu ne compte plus pour les valeurs retenues : réversible.
  exclu         boolean not null default false
);
create index if not exists oja_imports_recents on oja_imports (created_at desc);

alter table oja_imports enable row level security;
-- Atteinte par le rôle de service seulement (l'écran d'import du desk) : aucun accès direct du navigateur, comme « auction_results ».
