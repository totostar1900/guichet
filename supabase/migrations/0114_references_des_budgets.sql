-- LES PIECES SUR LESQUELLES LE DESK S'EST APPUYE.
--
-- `source` dit d'ou vient LE CHIFFRE ; ceci dit sur quoi s'appuie LA LECTURE,
-- et ce n'est pas le meme objet : une note cite une declaration ministerielle,
-- un communique d'adjudication, un collectif depose — des pieces qui ne
-- portent aucun montant du tableau mais sans lesquelles le raisonnement ne se
-- verifie pas.
--
-- JSON POUR LA MEME RAISON QUE LES POSTES : une piece est un titre, un
-- editeur, parfois une date, parfois une adresse. Une table normalisee
-- imposerait un catalogue de documents que personne ne tient.
--
-- CELLES D'UNE NOTE SONT FIGEES AVEC ELLE. Une note relue dans deux ans doit
-- montrer les pieces qu'elle avait sous les yeux, et non celles que la fiche
-- porte alors : c'est la meme raison qui fait que son releve est copie et non
-- recalcule.
alter table public.budgets_etats
  add column if not exists references_pieces jsonb not null default '[]'::jsonb;

alter table public.notes_budget
  add column if not exists references_pieces jsonb not null default '[]'::jsonb;

-- UNE NOTE SANS PIECE NE SE VERIFIE PAS. La fiche en porte au moins une des
-- qu'un budget y est releve, et la note les reprend : exiger le contraire
-- laisserait passer une lecture qu'aucun document n'etaye.
--
-- La contrainte ne vaut que pour les notes ecrites a partir d'ici : celles
-- deja en base, s'il y en a, gardent leur tableau vide. `not valid` dit
-- exactement cela, et c'est voulu — une migration qui refuse de s'appliquer
-- sur l'existant se contourne en la sautant, ce qui est pire.
alter table public.notes_budget
  add constraint notes_budget_references_non_vides check (jsonb_array_length(references_pieces) > 0) not valid;
