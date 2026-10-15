-- LE REGISTRE DE L'ENCOURS, LIGNE A LIGNE, TEL QUE LA BEAC LE PUBLIE.
--
-- Dix bulletins trimestriels portent, pays par pays, la liste des titres en
-- vie a la date d'arrete : code du CRCT, dates, maturite, nombre de titres,
-- valeur faciale, encours. C'est le registre de celui qui le tient, la ou
-- notre `debt_outstandings` est reconstitue a partir du bulletin de la cote.
--
-- LA DATE D'ARRETE EST CELLE DU TABLEAU, PAS CELLE DU BULLETIN : le numero 9
-- est date de mars 2020 et son tableau de la Guinee Equatoriale s'arrete au
-- 31 decembre 2019.
--
-- LA CLEF EST (arrete, isin, emis_le) : une meme ligne peut etre abondee, et
-- le registre la reprend alors deux fois avec deux dates d'emission.
create table if not exists public.beac_encours_lignes (
  id uuid primary key default gen_random_uuid(),
  arrete date not null,
  pays text not null,
  isin text not null,
  instrument text,
  emis_le date,
  echeance_le date,
  tenor text,
  titres numeric,
  faciale numeric,
  encours numeric not null,
  source_titre text,
  source_chemin text,
  file_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (arrete, isin, emis_le)
);

create index if not exists beac_encours_lignes_arrete_idx on public.beac_encours_lignes (arrete);
create index if not exists beac_encours_lignes_pays_idx on public.beac_encours_lignes (pays, arrete);
create index if not exists beac_encours_lignes_isin_idx on public.beac_encours_lignes (isin);

alter table public.beac_encours_lignes enable row level security;
