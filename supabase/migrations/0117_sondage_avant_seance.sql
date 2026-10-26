-- LE SONDAGE D'AVANT SÉANCE : CE QUE LA PLACE PRENDRAIT, AVANT QU'IL Y AIT
-- QUOI QUE CE SOIT À PRENDRE.
--
-- CE QUE LE DIRIGEANT A DEMANDÉ : « Le sondage demande une page à lui. Pour
-- l'instant il mène aux adjudications, où il n'a pas sa place. Construire une
-- page où le client accède aux lignes sondées par le desk — montant et
-- délai / date — et y répond, et où il peut aussi pousser sa propre ligne. Le
-- desk recevra les lignes avec toutes leurs caractéristiques (OTA, BTA, pays,
-- maturité, coupon, prix, date…) et un robot consolidera et proposera un
-- consensus. »
--
-- POURQUOI UNE TABLE ET NON UNE COLONNE DE PLUS. Le sondage qui existait ne
-- sondait que ce qui EXISTE DÉJÀ : le client posait un montant et une condition
-- sur une séance annoncée, qui a une date, un ISIN et un communiqué. Ici on
-- sonde AVANT — « prendriez-vous une OTA camerounaise à cinq ans, autour de
-- 6,5 %, dans trois semaines ? » — et rien de cela n'existe encore. Ce n'est
-- donc ni une « offers » (pas d'ISIN, pas de version, pas de cours, et surtout
-- rien à faire dans les quinze listes de ce qui s'achète) ni une « intents »
-- (une intention engage, se signe, porte un plafond et fabrique un bulletin ;
-- une réponse de sondage n'engage rien, c'est sa définition).
--
-- UNE SEULE TABLE POUR TROIS RÔLES, et c'est le discriminant qui les sépare :
--
--   origine « desk », reponse_a nul    → la question que la maison pose
--   origine « client », reponse_a mis  → la réponse d'un client à cette question
--   origine « client », reponse_a nul  → la ligne qu'un client pousse lui-même
--
-- Deux tables auraient demandé deux API de dépôt, deux jeux d'essai et deux
-- consolidations — alors que la consolidation est justement ce qui doit les
-- voir ensemble. « montant » veut dire LA TAILLE DE CETTE LIGNE TELLE QUE SON
-- AUTEUR LA VOIT : ce que la maison cherche à placer, ou ce que le client
-- prendrait. C'est le même sens dans les trois rôles.

create table if not exists survey_lines (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  origine text not null check (origine in ('desk', 'client')),
  -- La question à laquelle cette ligne répond. Sa disparition emporte les
  -- réponses : une réponse à une question retirée ne veut plus rien dire, et
  -- la garder orpheline la ferait compter dans un consensus sans en-tête.
  reponse_a uuid references survey_lines (id) on delete cascade,
  user_id text,
  client_name text,
  client_segment text,
  instrument text not null check (instrument in ('OTA', 'BTA')),
  country text not null,
  tenor text not null,
  rate numeric,
  price_pct numeric,
  montant bigint not null check (montant > 0),
  seance_le date,
  dans_jours int,
  note text,
  state text not null default 'ouverte' check (state in ('ouverte', 'consolidee', 'close')),
  closed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- UNE QUESTION N'A PAS DE CLIENT, UNE RÉPONSE EN A UN. Sans cette règle, une
  -- ligne du desk pouvait porter un userId par accident de code et paraître sur
  -- la page d'un client comme sa propre attente.
  constraint survey_lines_client_si_client check ((origine = 'desk') = (user_id is null)),
  -- UNE RÉPONSE VIENT D'UN CLIENT. Le desk ne se répond pas à lui-même : il
  -- pose la question, et il la clôt.
  constraint survey_lines_reponse_du_client check (reponse_a is null or origine = 'client'),
  -- QUAND, ET D'UNE SEULE FAÇON. Une date ET un délai sur la même ligne, ce
  -- sont deux réponses à « à partir de quand » : la consolidation devrait
  -- choisir, et elle choisirait mal.
  constraint survey_lines_quand check (num_nonnulls(seance_le, dans_jours) <= 1),
  -- UN BON N'A NI PRIX NI COUPON : il se vend précompté, et son taux EST son
  -- niveau. Un prix inscrit ici porterait au desk un chiffre qui n'existe pas
  -- sur ce compartiment.
  constraint survey_lines_bta_sans_prix check (instrument <> 'BTA' or price_pct is null),
  constraint survey_lines_taux_plausible check (rate is null or (rate > 0 and rate <= 30)),
  constraint survey_lines_prix_plausible check (price_pct is null or (price_pct >= 50 and price_pct <= 150))
);

comment on table survey_lines is
  'Le sondage d''avant séance : les lignes que la maison sonde, les réponses des clients et les lignes qu''ils poussent. Rien ici n''engage personne — voir domain/sondage.';
comment on column survey_lines.montant is
  'La taille de cette ligne telle que son auteur la voit : ce que la maison cherche, ou ce que le client prendrait.';
comment on column survey_lines.reponse_a is
  'La ligne du desk à laquelle celle-ci répond. Nulle sur une question, et nulle sur une ligne qu''un client pousse de lui-même.';

-- LE CLIENT LIT SA PAGE, ET LE DESK LIT SA FILE : deux lectures, deux index.
-- Sans le premier, la page d'un client balaie la table entière à chaque visite.
create index if not exists survey_lines_user_idx on survey_lines (user_id) where user_id is not null;
create index if not exists survey_lines_ouvertes_idx on survey_lines (state, created_at desc);
create index if not exists survey_lines_reponse_a_idx on survey_lines (reponse_a) where reponse_a is not null;

-- LE ROBOT DU SOIR BALAIE PAR LA DATE, comme celui des arbitrages : une ligne
-- dont le jour est passé n'attend plus rien, et la laisser « ouverte » la
-- ferait compter dans un consensus que plus personne ne peut honorer.
create index if not exists survey_lines_seance_le_idx on survey_lines (seance_le) where seance_le is not null and state = 'ouverte';

alter table survey_lines enable row level security;

-- CE QUE CHACUN VOIT. Les questions de la maison sont publiques — c'est leur
-- objet, on y répond. Les réponses et les lignes poussées sont privées : savoir
-- qui prendrait combien est exactement ce qu'un concurrent voudrait lire, et le
-- consensus est la seule forme sous laquelle cette demande sort.
drop policy if exists survey_lines_lire_les_questions on survey_lines;
create policy survey_lines_lire_les_questions on survey_lines
  for select using (origine = 'desk');

drop policy if exists survey_lines_lire_les_siennes on survey_lines;
create policy survey_lines_lire_les_siennes on survey_lines
  for select using (user_id = auth.uid()::text);

drop policy if exists survey_lines_poser_la_sienne on survey_lines;
create policy survey_lines_poser_la_sienne on survey_lines
  for insert with check (origine = 'client' and user_id = auth.uid()::text);

-- LE CLIENT RETIRE LA SIENNE, ET IL NE PEUT FAIRE QUE CELA. Changer l'état
-- d'une ligne est un geste du desk — « portée au Trésor » est un fait qu'il
-- constate — mais la retirer appartient au client : rien ne l'engageait, et
-- une attente qu'on ne peut pas défaire est une attente qui se garde.
drop policy if exists survey_lines_retirer_la_sienne on survey_lines;
create policy survey_lines_retirer_la_sienne on survey_lines
  for update using (origine = 'client' and user_id = auth.uid()::text)
  with check (origine = 'client' and user_id = auth.uid()::text);
