-- LE LIVRE DES MOUVEMENTS DU MARCHE DES TITRES PUBLICS DE LA CEMAC.
--
-- La BEAC publie, par sa Cellule de reglement et de conservation des titres,
-- un TABLEAU DE BORD HEBDOMADAIRE qui liste operation par operation ce que
-- les six Tresors font de leur dette : emissions, abondements, rachats,
-- remboursements et paiements d'interets, avec le code d'emission, le
-- montant EN FCFA, la date d'operation et la date de reglement.
--
-- POURQUOI CETTE TABLE CHANGE LA MESURE. L'encours adjuge etait reconstitue
-- a partir des 252 communiques de resultats, ce qui laissait trois trous :
-- un tiers des seances annoncees n'ont jamais publie de resultat ; les
-- remboursements etaient SUPPOSES in fine faute de les connaitre ; et le
-- cout annuel de la dette adjugee ne se calculait pas du tout. Le tableau de
-- bord donne les trois directement, et en francs, sans ambiguite d'unite.
--
-- ET IL REGARDE DEVANT : son titre dit « operations PREVUES pour la semaine
-- du … ». C'est donc aussi le calendrier a court terme, que la page des
-- annonces ne donnait plus depuis le 22 septembre.
create type public.operation_du_tresor as enum (
  'emission',            -- emission par adjudication
  'abondement',          -- reouverture d'une ligne existante
  'remboursement',       -- capital rendu
  'paiement_interets',   -- coupon
  'rachat',              -- le Tresor reprend sa propre dette
  'autre'
);

create table if not exists public.treasury_operations (
  id uuid primary key default gen_random_uuid(),

  -- LA PIECE D'ABORD : une ligne sans son document ne se defend pas.
  source_url text not null,
  source_title text,
  -- La semaine couverte, telle que le tableau l'annonce.
  semaine_du date,
  semaine_au date,

  pays text not null,
  instrument text,
  tenor text,
  -- « CM2B00000053 OTA 5 ANS 5,50% 26-FEVR-2026 », tel quel : c'est la cellule.
  code_enchere text,
  -- Le code seul, qui relie a une ligne d'adjudication.
  code_emission text,
  coupon_rate numeric,
  maturity_on date,

  operation public.operation_du_tresor not null,
  -- EN FRANCS, parce que la piece les imprime en francs. Aucune conversion.
  montant numeric,
  operation_on date,
  settle_on date,
  observations text,

  -- La lecture : par qui, quand, avec quel modele. Une ligne tiree d'un scan
  -- par un modele n'a pas le meme poids qu'une ligne tapee a la main, et la
  -- table doit pouvoir le dire.
  read_at timestamptz,
  read_model text,
  confirmed_by text,
  confirmed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- UNE OPERATION EST UNIQUE PAR PIECE, LIGNE ET DATE. Relire le meme tableau
  -- de bord deux fois ne doit pas doubler le marche : c'est exactement le
  -- genre de doublon qui gonfle un encours sans que rien ne le trahisse.
  unique (source_url, code_enchere, operation, operation_on, montant)
);

create index if not exists treasury_operations_pays_idx on public.treasury_operations (pays, operation_on);
create index if not exists treasury_operations_code_idx on public.treasury_operations (code_emission);
create index if not exists treasury_operations_date_idx on public.treasury_operations (operation_on);

alter table public.treasury_operations enable row level security;

comment on table public.treasury_operations is
  'Les operations du marche des valeurs du Tresor de la CEMAC, lues sur le tableau de bord hebdomadaire de la BEAC. Montants en FCFA.';
comment on column public.treasury_operations.montant is
  'En FCFA. La piece les imprime ainsi, contrairement aux communiques de resultats qui sont en millions.';
