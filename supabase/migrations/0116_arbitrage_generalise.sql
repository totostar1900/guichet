-- L'ARBITRAGE GÉNÉRALISÉ : DEUX BORNES, ET ELLES SONT OBLIGATOIRES.
--
-- La migration 0042 a fait du passage de fonds à fonds un fil entre deux ordres
-- ordinaires : « switch_to_offer » sur le rachat, « switch_from_intent » sur la
-- souscription. Le dirigeant l'a généralisé le 25 octobre 2026 : « Arbitrage
-- généralise l'idée de déplacer de l'argent, d'un instrument à l'autre.
-- L'argent ne bouge que si l'opération entière est faisable de bout en bout. »
--
-- CE QUI CHANGE EN BASE EST PETIT, ET C'EST VOULU. Les deux colonnes de 0042
-- portent déjà le fil ; ce qui manquait n'est pas un objet « arbitrage », c'est
-- ce qui le BORNE. Dès qu'une ligne cotée entre dans la paire, il n'y a plus de
-- simultanéité possible : un ordre peut rester plusieurs séances sans trouver
-- preneur. La paire est donc ARMÉE, et une paire armée sans borne est une
-- promesse sans fin — rien ne la déclenche, rien ne l'éteint, et le client n'a
-- aucun moment où on lui rend la main.
--
--   « switch_floor » le montant, en francs, sous lequel la vente ne part pas.
--                    Il protège de l'exécution partielle sur un carnet mince :
--                    une vente servie à moitié ne doit pas déclencher un achat
--                    que le client n'aurait pas fait pour cette somme-là.
--
--   « switch_by »    le jour au-delà duquel tout s'annule, POSITION INTACTE.
--                    Un arbitrage qui expire sans rien faire n'est pas une
--                    panne : c'est la protection qui a joué.
--
-- LES DEUX SONT OBLIGATOIRES, tranché par le dirigeant le 26 octobre 2026, et
-- la contrainte le dit : une ligne qui porte une arrivée porte les deux bornes,
-- ou n'existe pas. Elle est écrite en base plutôt que laissée au code parce que
-- le desk, les robots et l'import écrivent dans cette table par trois chemins
-- différents, et qu'une règle tenue par un seul d'entre eux n'est pas tenue.
--
-- Rien d'autre n'est contraint : l'immense majorité des ordres ne porte aucune
-- des trois colonnes, et la contrainte les laisse passer.

alter table intents add column if not exists switch_floor bigint;
alter table intents add column if not exists switch_by date;

comment on column intents.switch_floor is
  'Arbitrage : le produit de vente, en francs, sous lequel rien ne part. Obligatoire dès qu''il y a une arrivée.';
comment on column intents.switch_by is
  'Arbitrage : le jour au-delà duquel la paire s''annule, position intacte. Obligatoire dès qu''il y a une arrivée.';

-- LES ORDRES D'AVANT N'ONT PAS DE BORNES, et la contrainte les refuserait.
-- Ils sont repris avant qu'elle n'existe : le plancher à un franc — c'est-à-dire
-- « tout produit convient », ce qui était la règle tacite — et la date à trente
-- jours après la création, qui est l'ordre de grandeur d'une centralisation.
-- Les reprendre à NULL en désarmant la colonne d'arrivée aurait effacé une
-- instruction que des clients ont signée.
update intents
   set switch_floor = coalesce(switch_floor, 1),
       switch_by    = coalesce(switch_by, (created_at::date + interval '30 days')::date)
 where switch_to_offer is not null;

alter table intents add constraint intents_arbitrage_borne
  check (switch_to_offer is null or (switch_floor is not null and switch_floor > 0 and switch_by is not null));

-- Le robot du soir balaie les paires armées dont la date est passée : il lit
-- par la date, pas par la destination.
create index if not exists intents_switch_by_idx
  on intents (switch_by)
  where switch_to_offer is not null;
