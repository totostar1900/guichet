-- LE LECTEUR GARDE SES NOTES, ET DIT QUEL LECTEUR A LU.
--
-- Deux manques mesurés le 11 octobre 2026, et le même défaut derrière :
-- le robot sait des choses que la base jette.
--
-- 1. LES NOTES. Le lecteur garde déjà, pour chaque difficulté, le texte du
--    PDF qu'il n'a pas su lire et ce qu'il y cherchait (Carnet.sur, quatre
--    points d'appel). Rien de cela n'était enregistré : seule la PHRASE
--    survivait, dans « warnings ». Le desk lisait donc « Obligation
--    CM0000020115 : ligne de cours non reconnue » sans aucun moyen de savoir
--    de quelle ligne du document on parle. Une plainte, pas une question.
--
-- 2. LA VERSION DU LECTEUR. Pour répondre à « ces 212 séances gagneraient-
--    elles quelque chose à être relues ? », il a fallu reprendre les 212 PDF
--    et les repasser au lecteur. Quinze minutes de machine pour une réponse
--    qui était déductible : une séance lue par le lecteur courant n'a rien à
--    gagner. Avec cette colonne, c'est une requête.
--
-- Les 812 lectures existantes n'ont ni l'une ni l'autre, et c'est juste :
-- elles ont été faites par un lecteur qui ne gardait pas ses notes. Nul ne
-- doit pouvoir les croire à jour.
alter table market_bulletins add column if not exists notes jsonb;
alter table market_bulletins add column if not exists reader_version int;

comment on column market_bulletins.notes is
  'Ce que le lecteur a dit de ses difficultés, avec le texte brut du PDF, ce qu''il y cherchait et la page. Sa matière première : c''est avec cela que le desk peut répondre.';
comment on column market_bulletins.reader_version is
  'Quel lecteur a produit cette lecture (VERSION_DU_LECTEUR). Absent = lue avant le 11 octobre 2026, donc par un lecteur ancien.';

-- Les séances lues par un lecteur ancien, qui est la seule question que cette
-- colonne existe pour servir.
create index if not exists market_bulletins_reader_version_idx
  on market_bulletins (reader_version nulls first, session_date desc);
