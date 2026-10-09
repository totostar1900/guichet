-- LE MANDAT DE PRÉLÈVEMENT : la maison tire, au lieu que le client pousse.
--
-- Tout le reste de la plateforme va dans un sens : le client signe, puis il
-- vire. Le prélèvement inverse la direction, sur une autorisation donnée une
-- fois. Il rend l'épargne programmée autonome, qui sans lui demande au client
-- de penser à l'alimenter, et il supprime la référence recopiée, puisque c'est
-- la maison qui émet l'opération.
--
-- Deux décisions de la maison, du 9 octobre 2026, que la table porte :
--   UN MANDAT PAR USAGE (`objet`), parce qu'un mandat général « prélevez ce
--   qu'il faut » est juridiquement fragile et commercialement effrayant ;
--   CALENDRIER SEULEMENT, donc un jour du mois, et jamais de tirage à la
--   demande.
--
-- `max_amount` est le plafond par échéance. C'est le même objet que le plafond
-- « au plus » d'un ordre : la maison ne prélève jamais au-delà de ce qui a été
-- signé.
--
-- `revoked_at` ne supprime pas la ligne : une contestation porte sur un tirage
-- passé, donc l'historique survit à la révocation. C'est la règle des
-- instructions vivantes.
create table if not exists direct_debit_mandates (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  user_id uuid not null,
  objet text not null check (objet in ('provision', 'instruction')),
  standing_id uuid,
  bank_name text not null,
  bank_account text not null,
  account_holder text not null,
  max_amount numeric not null check (max_amount > 0),
  day_of_month integer check (day_of_month between 1 and 28),
  amount numeric check (amount > 0),
  state text not null default 'actif' check (state in ('actif', 'suspendu', 'revoque')),
  signed_at timestamptz,
  signed_method text,
  signed_to text,
  doc_id uuid,
  pending_code_hash text,
  pending_code_at timestamptz,
  pending_code_tries integer not null default 0,
  pending_code_to text,
  revoked_at timestamptz,
  revoked_reason text,
  rejects integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists direct_debit_mandates_user on direct_debit_mandates (user_id, created_at desc);
create index if not exists direct_debit_mandates_actifs on direct_debit_mandates (state, day_of_month) where state = 'actif' and signed_at is not null;

comment on table direct_debit_mandates is
  'Les mandats de prélèvement signés par les clients. Un mandat par usage, calendrier seulement, plafond par échéance. Un mandat révoqué se garde : une contestation porte sur un tirage passé.';
