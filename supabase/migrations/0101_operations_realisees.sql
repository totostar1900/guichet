-- LE PREVU ET LE REALISE, COTE A COTE, SUR LA MEME LIGNE.
--
-- Le TABLEAU DE BORD hebdomadaire annonce « les operations PREVUES pour la
-- semaine » : ses montants d emission sont des intentions, mesure faite, ils
-- egalent 80 fois sur 134 le montant annonce et 34 fois seulement le servi.
--
-- Le RAPPORT hebdomadaire, publie apres coup par la meme cellule, porte les
-- DEUX colonnes : « montants mis en adjudication / a rembourser / interets a
-- payer » et « montants leves / rembourses / interets payes », plus les
-- statistiques de la seance : participation des SVT, taux de souscription,
-- taux ou prix moyen pondere, marginal, minimum et maximum.
--
-- 87 rapports dormaient sur le disque sans que personne les ouvre, et ils
-- portent ce que les communiques de resultats portent, pour TOUTES les
-- seances et non pour les 252 publiees separement.
--
-- LA CLEF D UNICITE CHANGE, ET C EST LE POINT DELICAT. Elle contenait
-- source_url et montant : le rapport aurait donc cree une SECONDE ligne pour
-- la meme operation, avec le montant realise, et toute somme aurait double.
-- Une operation est desormais identifiee par ce qu elle EST (une ligne, un
-- acte, un jour, un pays), pas par la piece qui la rapporte ni par son
-- montant. Verifie avant d appliquer : 1 160 lignes, 1 160 actes distincts.
alter table public.treasury_operations
  add column if not exists montant_realise numeric,
  add column if not exists taux_participation numeric,
  add column if not exists taux_souscription numeric,
  add column if not exists taux_prix_moyen numeric,
  add column if not exists taux_prix_marginal numeric,
  add column if not exists taux_prix_min numeric,
  add column if not exists taux_prix_max numeric,
  add column if not exists source_rapport_url text;

comment on column public.treasury_operations.montant is
  'Le montant PREVU, tel que le tableau de bord l annonce. Pour une emission c est une intention de lever.';
comment on column public.treasury_operations.montant_realise is
  'Le montant REALISE, tel que le rapport hebdomadaire le constate : leve, rembourse ou paye.';
comment on column public.treasury_operations.source_rapport_url is
  'Le rapport qui a constate le realise, quand il y en a un. Distinct de source_url, qui est le tableau de bord.';

alter table public.treasury_operations
  drop constraint if exists treasury_operations_source_url_code_enchere_operation_opera_key;

create unique index if not exists treasury_operations_acte_idx
  on public.treasury_operations (coalesce(code_enchere, ''), operation, coalesce(operation_on, '1900-01-01'::date), pays);
