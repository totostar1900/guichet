-- LE CRAN DU MILIEU : « FERMETURE SEULE ».
--
-- Il manquait, et son absence poussait à suspendre des comptes qui ne
-- méritaient que de ne plus grossir. Entre le prépaiement (payez d'abord) et
-- la suspension (nous n'agissons plus de nous-mêmes), il dit simplement :
-- plus rien de nouveau. Le client garde la main sur ce qu'il détient déjà,
-- choisit quoi vendre et quand, et sort son argent tout seul.
--
-- Rien à modifier dans la table : la colonne est un texte, et c'est son
-- commentaire qui porte le contrat. Le garde de src/lib/domain/mesure.ts
-- décide, et il décide maintenant sur le SENS de l'intention : un ordre de
-- vente et un ordre d'achat passaient par la même porte, donc la refuser
-- refusait les deux.
comment on column profiles.mesure is
  'aucune | prepaiement | fermeture_seule | suspendu. Ne retient jamais les espèces ni les titres du client, et ne coupe jamais son chemin vers le desk. « fermeture_seule » refuse tout ce qui augmente ses lignes et laisse tout ce qui les réduit.';
