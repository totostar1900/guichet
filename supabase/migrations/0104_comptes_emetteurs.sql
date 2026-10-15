-- LES COMPTES DES EMETTEURS COTES, LUS DANS LEURS ETATS FINANCIERS.
--
-- CE QUE CELA DEBLOQUE. Le ratio cours sur benefice est la mesure la plus
-- demandee d une cote, et la colonne du benefice par action du bulletin
-- officiel est VIDE sur les 4 995 lignes d actions. Le resultat net n existe
-- nulle part ailleurs que dans ces cinquante pieces, dont trente-huit sont
-- des scans qu il a fallu faire lire.
--
-- LES MONTANTS SONT EN FRANCS, l unite imprimee etant gardee a part. Un etat
-- OHADA se presente « en milliers de FCFA », parfois « en millions » : stocker
-- le chiffre brut ferait comparer un millier a un million, et c est l erreur
-- qui a coute trente mille milliards au Tchad.
--
-- LE REFERENTIEL EST UNE COLONNE, PAS UN DETAIL. Plusieurs emetteurs deposent
-- leurs comptes en OHADA ET en IFRS pour le meme exercice, avec deux resultats
-- nets differents. Le lecteur constate les deux ; c est la page qui choisit.
create table if not exists public.issuer_financials (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.issuer_documents(id) on delete cascade,
  mnemo text not null,
  exercice integer,
  referentiel text not null,
  unite text not null,
  resultat_net numeric,
  resultat_net_precedent numeric,
  capitaux_propres numeric,
  chiffre_affaires numeric,
  nombre_actions numeric,
  -- Seulement s il est IMPRIME. Jamais calcule : le nombre d actions du bilan
  -- et celui du bulletin ne concordent pas toujours.
  resultat_par_action numeric,
  remarques text,
  source_titre text,
  source_url text,
  file_key text,
  lu_le timestamptz,
  lu_par text,
  -- Comme pour les adjudications : une lecture de machine n engage rien tant
  -- qu une personne ne l a pas relue.
  confirme_par text,
  confirme_le timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- UNE PIECE, UNE LECTURE : relancer la campagne remplace, elle n ajoute pas.
create unique index if not exists issuer_financials_doc on public.issuer_financials (document_id);
create index if not exists issuer_financials_mnemo on public.issuer_financials (mnemo, exercice desc);

alter table public.issuer_financials enable row level security;
