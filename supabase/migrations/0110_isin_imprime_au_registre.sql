-- CE QUE LE BULLETIN A IMPRIMÉ NE DOIT JAMAIS DISPARAÎTRE.
--
-- Cent codes du registre de l'encours sont hors norme : un suffixe « /MN »,
-- un chiffre de trop, un chiffre manquant. Trente-neuf d'entre eux sont
-- tranchés par un témoin. Les réparer dans « isin » sans rien garder
-- effacerait ce que la source a écrit, et c'est exactement la faute que la
-- maison a payée le 16 octobre : trente-neuf lignes écrasées, dont
-- dix-neuf signées, et le compte de lignes qui ne bougeait pas était le
-- seul signal.
--
-- D'OÙ DEUX COLONNES PLUTÔT QU'UNE ÉCRITURE.
--
--   « isin_imprime » garde le code TEL QUE LE BULLETIN LE PORTE. Il reste
--   nul tant que personne n'a touché à la ligne : une colonne remplie veut
--   donc dire « cette ligne a été réparée », et la question « laquelle ? »
--   se répond par une requête et non par une fouille.
--
--   « isin_motif » dit POURQUOI, en toutes lettres et avec son témoin. Un
--   code remis d'aplomb sans motif est une affirmation sans preuve.
--
-- L'opération est réversible : « isin = coalesce(isin_imprime, isin) »
-- rend le registre à ce que la BEAC a écrit.

alter table public.beac_encours_lignes
  add column if not exists isin_imprime text,
  add column if not exists isin_motif text;

comment on column public.beac_encours_lignes.isin_imprime is
  'Le code tel que le bulletin l''imprime, gardé quand « isin » a été remis d''aplomb. Nul si la ligne n''a jamais été touchée.';
comment on column public.beac_encours_lignes.isin_motif is
  'Pourquoi le code a été remis d''aplomb, et par quel témoin.';

-- Retrouver les lignes réparées sans parcourir la table.
create index if not exists beac_encours_lignes_isin_imprime_idx
  on public.beac_encours_lignes (isin_imprime)
  where isin_imprime is not null;
