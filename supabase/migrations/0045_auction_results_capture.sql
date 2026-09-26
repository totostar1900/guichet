-- Ce que la saisie des résultats a appris à la table.
--
-- Deux corrections, toutes deux venues du même constat : la machine propose la
-- séance, une personne en lit les chiffres.
--
--   « code_emission » n'était pas connu au moment où la ligne naît. Le robot
--   lit l'index de la BEAC, où le titre donne le pays, l'instrument, la durée et
--   la date, mais jamais le code d'émission : celui-ci est imprimé à l'intérieur
--   du communiqué, qui est un scan. Exiger le code à la création obligeait donc
--   soit à inventer une valeur, soit à ne rien proposer du tout. Il devient
--   facultatif ici et obligatoire à la confirmation, ce qui est sa vraie règle :
--   sans lui la séance ne se rattache à aucune ligne.
--
--   « file_key » garde le communiqué avec la séance, comme la fiche d'une
--   annonce garde le sien. Le desk relit des chiffres sur un scan de travers ;
--   il doit l'avoir à côté du formulaire, pas dans un autre onglet, et une
--   adresse chez la BEAC ne se lira plus dans deux ans quand le chiffre, lui,
--   servira encore de référence.

alter table auction_results alter column code_emission drop not null;
alter table auction_results add column if not exists file_key text;

comment on column auction_results.code_emission is 'Le code du Trésor, lu dans le communiqué. Vide tant que personne ne l''a relu ; obligatoire pour confirmer.';
comment on column auction_results.file_key is 'Le communiqué, gardé octet pour octet, comme celui d''une annonce.';
