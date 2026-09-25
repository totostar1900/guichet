-- L'épargne programmée : une instruction permanente, et les ordres qu'elle produit.
--
-- Purpose Capital est société de bourse et n'a pas l'agrément de gestion : elle
-- distribue, elle ne gère pas. Un versement mensuel ne peut donc pas être un pot
-- commun, ni un arbitrage que la maison déciderait chaque mois. C'est une
-- instruction que le client donne une fois, et que la maison exécute sans jamais
-- rien choisir.
--
-- D'où la forme de cette table, qui est une contrainte réglementaire avant d'être
-- un choix technique : tout ce qui décide du prochain versement y est écrit
-- d'avance. Le montant, la destination (une ligne précise, pas une catégorie),
-- le jour, le début, la fin, et ce qu'il advient quand l'exécution est
-- impossible. Un tiers doit pouvoir lire la ligne et calculer ce qui partira le
-- 5 du mois prochain sans demander son avis au desk. Le jour où il faudrait le
-- lui demander, ce ne serait plus de l'exécution.
--
--   « day_of_month » va de 1 à 28. Tous les mois ont ces jours-là : un
--   versement au 31 obligerait à décider ce qu'on fait en février, et cette
--   décision n'appartient pas à la maison.
--
--   « on_blocked » est pris par le client à la signature, pas par le desk au
--   moment où ça bloque. Un fonds suspendu, un minimum relevé : on passe le
--   versement, ou on arrête l'instruction. Improviser serait décider à sa place.
--
--   « last_run_on » porte la date du dernier versement produit. Un seul par mois
--   civil : si le robot a manqué son jour, il rattrape, il ne double pas.
--
-- Les ordres produits restent des ordres ordinaires, confirmés, transmis,
-- exécutés et documentés par la machinerie qui existe. « intents.standing_id »
-- dit seulement de quelle instruction ils viennent.

create table if not exists standing_orders (
  id            uuid primary key default gen_random_uuid(),
  ref           text not null unique,
  user_id       uuid not null,
  client_name   text not null,
  client_segment text not null default '',
  -- la destination : une ligne, fixée à la signature et jamais choisie ensuite
  offer_id      text not null,
  amount        numeric(18, 2) not null check (amount > 0),
  day_of_month  smallint not null check (day_of_month between 1 and 28),
  starts_on     date not null,
  ends_on       date,
  state         text not null default 'active' check (state in ('active', 'suspendue', 'terminee', 'annulee')),
  on_blocked    text not null default 'passer' check (on_blocked in ('passer', 'arreter')),
  channel       text not null default 'E-mail',
  contact_phone text,
  contact_email text,
  last_run_on   date,
  stop_reason   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

create index if not exists standing_orders_user on standing_orders (user_id, created_at desc);
-- Le robot ne lit que les instructions vivantes : elles sont une poignée parmi
-- toutes celles qui ont vécu.
create index if not exists standing_orders_active on standing_orders (state, day_of_month) where state = 'active';

comment on column standing_orders.offer_id is
  'La destination, fixée à la signature : une ligne précise, jamais une catégorie.';
comment on column standing_orders.on_blocked is
  'Décidé par le client d''avance : passer ce versement, ou arrêter l''instruction.';

alter table standing_orders enable row level security;
-- Atteinte par le rôle de service seulement : les actions serveur de Mon espace
-- et du desk, et le robot mensuel. Aucun accès direct depuis le navigateur.

alter table intents add column if not exists standing_id uuid;
comment on column intents.standing_id is
  'L''instruction permanente qui a produit cet ordre, quand il vient d''une épargne programmée.';
create index if not exists intents_standing_idx on intents (standing_id) where standing_id is not null;
