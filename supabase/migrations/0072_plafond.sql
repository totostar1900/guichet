-- LE PLAFOND SIGNÉ : « au plus ceci », en francs.
--
-- Sur une part d'OPCVM le montant versé est ferme et seule la quantité flotte :
-- le client signe un montant et il n'y a rien à borner. Sur un titre, c'est
-- l'inverse : le prix servi à l'adjudication ou au marché décide de la dépense,
-- et on ne peut pas demander une signature sur un montant inconnu.
--
-- Le client signe donc une borne, calculée au prix le plus cher qu'il ait
-- accepté, et la maison ne l'engage jamais au-delà (convention, article 4,
-- version du 9 octobre 2026). Elle est figée à la déclaration : recalculée plus
-- tard elle suivrait les conditions du jour, et ne serait plus ce qui a été
-- signé.
alter table intents add column if not exists max_amount numeric;

comment on column intents.max_amount is
  'Plafond en FCFA signé par le client quand le prix n''est pas connu à la signature. Figé à la déclaration.';
