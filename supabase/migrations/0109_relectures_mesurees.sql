-- CE QU'UNE RELECTURE A RÉELLEMENT RENDU, GARDÉ PLUTÔT QUE REDEMANDÉ.
--
-- Le 16 octobre 2026, le contrôle « encours relus par le lecteur courant »
-- annonçait 6 826 lignes à relire. Il promettait dans son attendu « aucune
-- ligne qu'une relecture ferait GAGNER » et mesurait en réalité « aucune
-- ligne estampillée d'un lecteur antérieur ». Deux phrases différentes.
--
-- La passe a été lancée : 188 séances relues, et pas une ligne gagnée ni
-- perdue sur les quatre tables. Le lecteur avait bougé, ces séances-là non.
-- `TOUCHE_PAR_VERSION` dit quel LECTEUR une version a touché ; il ne dit pas
-- quelles SÉANCES. La v18 ne change que les bulletins à sous-tableaux, et
-- rallumer 270 séances pour s'en apercevoir est une heure perdue à chaque
-- montée de version.
--
-- CETTE TABLE GARDE LA RÉPONSE. Une mesure par couple (lecteur, version) :
-- combien de séances ont été passées, combien ont bougé, ce qui a été gagné
-- et perdu. Le contrôle lit cette ligne au lieu de redemander la passe, et
-- il dit la DATE de la mesure, pour qu'on puisse la contester comme tout le
-- reste.
--
-- Elle ne remplace pas l'estampille : l'estampille dit ce qu'une séance a
-- subi, cette table dit ce qu'une version vaut. La première répond à
-- « celle-ci est-elle à jour », la seconde à « cela valait-il la peine ».

create table if not exists relectures_mesurees (
  lecteur           text        not null,
  version           integer     not null,
  mesure_le         timestamptz not null default now(),
  -- La portée est décisive pour qui relit : un échantillon ne conclut pas
  -- comme une passe complète, et sans ce mot la ligne se lirait comme une
  -- preuve alors qu'elle n'est qu'un indice.
  portee            text        not null check (portee in ('echantillon', 'tout')),
  seances_testees   integer     not null,
  seances_changees  integer     not null,
  lignes_gagnees    integer     not null default 0,
  lignes_perdues    integer     not null default 0,
  note              text,
  primary key (lecteur, version)
);

comment on table relectures_mesurees is
  'Ce qu''une relecture par une version donnée du lecteur a réellement rendu. Permet à un contrôle de dire « mesuré, gain nul » au lieu de redemander une passe complète à chaque montée de version.';
