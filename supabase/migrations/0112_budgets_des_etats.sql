-- LE BUDGET D'UN ETAT, ET CE QUI EN ARRIVE SUR GUICHET.
--
-- « Dette des Etats » montre le STOCK. Ces tables portent le FLUX qui le
-- fabrique : ce qu'un Tresor encaisse, ce qu'il depense, ce qui manque, et par
-- quelles portes il va chercher ce qui manque. Une seule de ces portes — les
-- titres publics adjuges a la BEAC — debouche sur Guichet.
--
-- LA CLEF EST (pays, exercice), ET LE MILLESIME EST UNE COLONNE, non une
-- seconde ligne : a tout instant un seul texte est en vigueur pour une annee.
-- L'historique des versions vit dans le journal d'audit, comme partout.
--
-- POURQUOI LES POSTES SONT DU JSON ET NON DES LIGNES : les six Etats ne
-- decoupent pas leur budget pareil, et le decoupage change d'une loi a
-- l'autre. Une table de postes normalisee imposerait une nomenclature
-- commune que personne n'a votee ; on garde donc les intitules du document.
create table if not exists public.budgets_etats (
  id uuid primary key default gen_random_uuid(),
  pays text not null,
  exercice integer not null,
  millesime text not null check (millesime in ('vote', 'revision_annoncee', 'revision_deposee', 'revise')),
  loi text not null,
  promulguee_le date,
  hypotheses jsonb not null default '[]'::jsonb,
  budget_total numeric,
  recettes jsonb not null default '[]'::jsonb,
  depenses jsonb not null default '[]'::jsonb,
  -- Le solde ECRIT PAR LE DOCUMENT, jamais recalcule : les perimetres different.
  solde_declare numeric,
  besoin_de_financement numeric,
  financement jsonb not null default '[]'::jsonb,
  source jsonb not null,
  -- Ce que le desk n'a pas encore releve, nomme plutot que laisse vide.
  a_relever jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pays, exercice)
);

create index if not exists budgets_etats_pays_idx on public.budgets_etats (pays, exercice desc);

-- UNE NOTE DU DESK SUR UN ETAT. INTERNE, ET ELLE NE SORT PAS.
--
-- Elle se demande, elle ne tombe pas a date fixe : d'ou `motif` et
-- `demandee_par`, qui disent pourquoi elle existe. Elle separe le CONSTAT de
-- la LECTURE pour que le desk sache lesquelles de ses croyances portent.
--
-- `mal_lu` EST NOT NULL, et c'est volontaire : une note interne n'a plus de
-- lecteur exterieur pour la contredire, donc l'auto-correction est la seule
-- discipline qui lui reste. Vide, elle doit l'ecrire — « rien a corriger » est
-- une affirmation, pas une absence.
--
-- `releve` PORTE LES CHIFFRES QUE LA NOTE COMMENTE : l'ecart avec la note
-- suivante se CALCULE, il ne se redige pas.
create table if not exists public.notes_budget (
  id uuid primary key default gen_random_uuid(),
  pays text not null,
  exercice integer not null,
  numero integer not null,
  titre text not null,
  en_une_phrase text not null,
  motif text not null,
  demandee_par text not null,
  redigee_par text not null,
  relue_par text,
  close_le timestamptz,
  corps jsonb not null default '[]'::jsonb,
  surveiller jsonb not null default '[]'::jsonb,
  mal_lu text not null,
  releve jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (pays, exercice, numero)
);

create index if not exists notes_budget_pays_idx on public.notes_budget (pays, exercice desc, numero desc);

-- INTERNE AU DESK : aucune politique de lecture pour un client.
alter table public.budgets_etats enable row level security;
alter table public.notes_budget enable row level security;
