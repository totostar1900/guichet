-- LE PLAFOND PAR ORDRE D'UNE PERSONNE.
--
-- Le plafond du compte vient du PV et vit dans le dossier
-- (client_files.identity.plafondParOrdre, un champ du JSON : pas de colonne
-- à poser). Celui-ci est l'étage du dessous, pour les PV qui donnent des
-- pouvoirs inégaux : le directeur général cinquante millions, le trésorier
-- cinq.
--
-- Le plus bas des deux s'applique. Une délégation ne dépasse jamais le
-- mandat dont elle sort, donc un plafond de personne au-dessus de celui du
-- compte ne relève rien.
alter table acces_compte add column if not exists plafond_par_ordre numeric;

comment on column acces_compte.plafond_par_ordre is
  'Le plafond par ordre de CETTE personne, quand le PV donne des pouvoirs inégaux. Le plafond du compte vit dans client_files.identity.plafondParOrdre ; le plus bas des deux s''applique, car une délégation ne dépasse jamais le mandat dont elle sort.';
