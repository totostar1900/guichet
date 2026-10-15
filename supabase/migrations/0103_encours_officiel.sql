-- L ENCOURS OFFICIEL, ET LE PRIX QUE CHAQUE TRESOR PAIE.
--
-- La statistique mensuelle du marche des valeurs du Tresor est la seule piece
-- ou la BEAC publie son propre encours, pays par pays. Nous avons reconstitue
-- la dette adjugee a partir des communiques, et nous avions raison de le faire :
-- la reconstitution dit QUI A SERVI QUOI ET QUAND, ce que ce tableau ne dit pas.
-- Mais le total est ici, et c est lui qui sert de denominateur.
--
-- DEUX TABLES PARCE QUE DEUX CHOSES. Un encours est un stock a une date ; un
-- cout de ressources est un prix moyen sur une periode. Les melanger ferait une
-- table dont la moitie des colonnes serait vide a chaque ligne.
--
-- UNE PIECE PORTE HUIT MOIS, PAS UN : la table est un historique, et c est
-- heureux, deux numeros sur trente-deux seulement ayant une couche texte.

create table if not exists public.beac_encours_officiel (
  id uuid primary key default gen_random_uuid(),
  -- Le premier du mois du RELEVE, qui n est pas celui de la piece.
  mois date not null,
  -- Un pays, ou « CEMAC » pour le total que la piece imprime.
  pays text not null,
  -- En millions de francs, tel que la piece l ecrit.
  encours numeric not null,
  -- Le numero de la piece d ou vient le releve.
  numero integer,
  source_titre text,
  source_chemin text,
  file_key text,
  reserves text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- UN SEUL ENCOURS PAR MOIS ET PAR PAYS. Deux numeros rappellent le meme mois :
-- le plus recent remplace l ancien, et c est voulu, la BEAC revisant ses series.
create unique index if not exists beac_encours_officiel_point
  on public.beac_encours_officiel (mois, pays);

create table if not exists public.beac_cout_ressources (
  id uuid primary key default gen_random_uuid(),
  mois date not null,
  pays text not null,
  instrument text not null,
  -- En pour cent.
  taux numeric not null,
  source_titre text,
  source_chemin text,
  file_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists beac_cout_ressources_point
  on public.beac_cout_ressources (mois, pays, instrument);

alter table public.beac_encours_officiel enable row level security;
alter table public.beac_cout_ressources enable row level security;
