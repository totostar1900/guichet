-- Une pièce qu'on range, sans la perdre.
--
-- La BEAC publie ses avis d'annonce et ses communiqués de résultats sous des
-- adresses voisines, et l'un des premiers s'est retrouvé dans la table des
-- résultats : CM1200000808, Cameroun, BTA 26 semaines du 2 octobre 2019. Son
-- titre annonçait « Communiqué des résultats », son URL disait
-- « communiqué-dannonce », et seule la donnée tranchait : vingt milliards
-- annoncés, et rien d'autre. Ni soumis, ni servi, ni soumissionnaires, ni taux.
--
-- ─── Pourquoi une colonne et non une règle ──────────────────────────────────
--
-- Les deux règles évidentes ont été essayées sur le dépôt, et toutes deux
-- échouent.
--
--   « L'URL dit annonce » attrape douze pièces, dont ONZE sont de vrais
--   résultats : la BEAC publie des communiqués « Com-Annonce-résultat » qui
--   annoncent et résultent à la fois. La règle en écarterait onze à tort.
--
--   « Aucun chiffre de résultat » attrape la bonne, et une seule. Mais c'est
--   aussi, exactement, à quoi ressemble une séance pas encore lue. La règle
--   confondrait « ce n'est pas un résultat » avec « on ne l'a pas encore
--   saisi ».
--
-- C'est donc une décision de personne. Ce qu'on garde n'est pas qu'elle a été
-- prise, mais POURQUOI : « set_aside_reason » porte un motif, pas un booléen.
--
-- ─── Un troisième état ──────────────────────────────────────────────────────
--
-- Une séance était à relire ou relue. Elle peut maintenant être écartée, et les
-- trois s'excluent : une écartée ne compte ni dans la file de relecture, ni
-- parmi les résultats, ni dans la courbe. Le prédicat vit une seule fois, dans
-- src/lib/market/auction-results.ts, parce que le filtre était recopié dans une
-- dizaine d'endroits et que dix conditions finissent par diverger.
--
-- La pièce reste entière : la ligne, le communiqué archivé et son lien ne
-- bougent pas, et la séance paraît grisée dans le tableau avec son motif. Vider
-- les trois colonnes la remet dans la file. Une mise à l'écart qui ne se défait
-- pas n'a pas sa place dans une table que plusieurs mains tiennent.
--
-- Rien n'est perdu au passage : l'avis d'annonce en question est déjà dans
-- « emission_notices », là où les 373 avis vivent.

alter table auction_results add column if not exists set_aside_reason text;
alter table auction_results add column if not exists set_aside_by     text;
alter table auction_results add column if not exists set_aside_at     timestamptz;

comment on column auction_results.set_aside_reason is
  'Pourquoi cette pièce n''est pas un résultat. Un motif, jamais un booléen : « ce n''est pas un résultat » doit survivre à celui qui l''a constaté.';
comment on column auction_results.set_aside_at is
  'Écartée le. Vide, la séance est à relire ou relue ; rempli, elle est rangée et ne compte nulle part.';

-- Les écartées sont une poignée parmi toutes : l'index sert les listes qui les
-- retirent, et non celles qui les cherchent.
create index if not exists auction_results_set_aside on auction_results (set_aside_at) where set_aside_at is not null;
