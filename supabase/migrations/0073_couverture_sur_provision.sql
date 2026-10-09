-- RÉGLER UN ORDRE SUR SA PROVISION, SANS VIREMENT.
--
-- La provision existait déjà au journal des espèces (cash_kind « provision »),
-- mais elle ne servait à rien : un ordre signé envoyait toujours son client à
-- sa banque. Trois gestes et deux moments pour une opération dont l'argent
-- était déjà chez nous.
--
-- Ce qui est posé ici n'est PAS un mouvement d'espèces. Rien ne bouge à la
-- signature : la somme est RÉSERVÉE, et elle ne quitte le solde qu'au
-- règlement de l'opération, par l'écriture habituelle. Les confondre
-- compterait la dépense deux fois.
--
-- C'est exactement ce que la convention dit depuis le 9 octobre 2026 :
-- « Est disponible ce qui n'est pas affecté au règlement d'une opération en
-- cours, jusqu'à ce que celle-ci soit réglée ou devienne caduque. » La
-- réservation cesse donc d'elle-même quand l'ordre est réglé, annulé ou non
-- servi, sans qu'aucun geste ne la défasse.
alter table intents add column if not exists covered_at timestamptz;
alter table intents add column if not exists covered_amount numeric;

comment on column intents.covered_at is
  'Quand l''ordre a été couvert par la provision du client, à la signature. Aucun mouvement d''espèces : une réservation.';
comment on column intents.covered_amount is
  'La somme réservée sur le solde disponible : le montant ferme, ou le plafond signé quand le prix est inconnu.';
