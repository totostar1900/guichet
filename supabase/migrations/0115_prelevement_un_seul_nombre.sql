-- LE PRÉLÈVEMENT : UN SEUL NOMBRE, UNE SEULE PRÉSENTATION PAR MOIS.
--
-- Trois règles de la maison, arrêtées le 25 octobre 2026, et la table les
-- porte plutôt que de les laisser au code.
--
--   UN SEUL MONTANT. Le mandat en portait deux : celui qu'on prélève, et un
--   plafond « au-delà duquel la maison ne va jamais ». Le second était
--   emprunté au plafond « au plus » d'un ordre de bourse, où il protège d'un
--   prix inconnu à la signature. Ici rien n'est inconnu : le client écrit la
--   somme, et c'est cette somme-là qui est présentée à sa banque, ni plus ni
--   moins. Un second nombre ne protégeait de rien et faisait chercher lequel
--   des deux serait débité.
--
--   UNE PRÉSENTATION PAR MOIS, ET UN MOIS REFUSÉ EST SAUTÉ. Un rejet pour
--   provision insuffisante était représenté quinze jours plus tard. C'est une
--   seconde chance à l'intention du client, et une seconde ponction
--   d'incident à ses frais s'il n'a toujours rien : il paie deux fois pour le
--   même mois. `retry_of` reliait ces deux présentations ; il n'y en a plus
--   qu'une, et l'index l'empêche désormais structurellement.
--
--   DEUX MOIS REFUSÉS DE SUITE, ET LE PRÉLÈVEMENT S'ARRÊTE. `rejects` ne
--   change pas : il comptait déjà des rejets consécutifs, remis à zéro au
--   premier encaissement. Ce sont maintenant des MOIS consécutifs, puisqu'il
--   n'y a plus qu'une présentation par mois.

-- Le montant devient obligatoire. Les mandats d'épargne programmée n'en
-- portaient pas : ils tenaient le leur de l'instruction, qui peut changer sans
-- que le mandat soit resigné — la banque voyait alors un chiffre que le client
-- n'avait jamais écrit sur cette autorisation. Le plafond signé est la
-- meilleure reprise disponible pour ces lignes : c'est le seul montant que le
-- client ait écrit de sa main sur le mandat.
update direct_debit_mandates set amount = max_amount where amount is null;

alter table direct_debit_mandates alter column amount set not null;
alter table direct_debit_mandates add constraint direct_debit_mandates_montant_positif check (amount > 0);
alter table direct_debit_mandates drop column max_amount;

comment on column direct_debit_mandates.amount is
  'Le montant présenté à la banque à chaque échéance : celui que le client a écrit, ni plus ni moins. Il n''y a pas de plafond à côté — voir la migration 0115.';

comment on table direct_debit_mandates is
  'Les mandats de prélèvement signés par les clients. Un mandat par usage, calendrier seulement, un seul montant. Un mandat révoqué se garde : une contestation porte sur un tirage passé.';

-- La seconde présentation n'existe plus.
alter table debit_draws drop column retry_of;

-- UNE PRÉSENTATION PAR MOIS, TENUE PAR LA BASE. La contrainte d'origine
-- portait sur (mandat, date d'échéance) : deux dates du même mois passaient,
-- et c'est exactement ce que faisait une seconde présentation. Celle-ci ferme
-- la porte, y compris à un geste manuel du desk.
create unique index if not exists debit_draws_une_par_mandat_et_par_mois
  on debit_draws (mandate_id, (date_part('year', due_on)::int * 100 + date_part('month', due_on)::int));

comment on table debit_draws is
  'Les tirages, une ligne par client et par MOIS. notice_sent interdit la remise sans préavis parti ; reject_code porte la cause, qui décide de la suite. « Sans nouvelle » ne s''y range pas : il se calcule.';
