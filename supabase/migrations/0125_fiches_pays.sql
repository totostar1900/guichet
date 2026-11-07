-- ═══════════════════════════════════════════════════════════════════════════
-- LES FICHES PAYS : LA SANTÉ ÉCONOMIQUE ET FINANCIÈRE D'UN ÉMETTEUR
--
-- Deux tables, deux natures de matière :
--
--   pays_indicateurs  les chiffres LUS par un robot au FMI (Perspectives de
--                     l'économie mondiale) et à la Banque mondiale. Chaque
--                     valeur porte son année, sa source, et le fait qu'elle est
--                     estimée ou prévue.
--   entite_faits      les faits SAISIS au Desk, chaque trimestre : notations des
--                     agences, évaluation du FMI, retards et événements de
--                     paiement, chiffres des comptes d'une institution. Chacun a
--                     sa date et le lien de sa pièce. Jamais un commentaire de la
--                     maison.
--
-- Les deux ne sont atteintes que par le rôle de service, comme « auction_results ».
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.pays_indicateurs (
  pays        text not null,
  indicateur  text not null,
  annee       integer not null,
  valeur      numeric not null,
  source      text not null,
  estime      boolean not null default false,
  lu_le       timestamptz not null default now(),
  primary key (pays, indicateur, annee)
);

create table if not exists public.entite_faits (
  id           uuid primary key default gen_random_uuid(),
  entite       text not null,
  genre        text not null check (genre in ('notation', 'evaluation', 'evenement', 'chiffre')),
  organisme    text not null,
  valeur       text not null,
  perspective  text,
  unite        text,
  date_fait    date not null,
  url          text not null,
  saisi_par    text not null,
  saisi_le     timestamptz not null default now()
);
create index if not exists entite_faits_par_entite on public.entite_faits (entite, date_fait desc);

alter table public.pays_indicateurs enable row level security;
alter table public.entite_faits enable row level security;
