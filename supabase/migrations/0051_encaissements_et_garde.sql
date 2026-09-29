-- Ce qui est arrivé, et ce que la conservation coûte.
--
-- Deux services qui n'existaient qu'à moitié. Le réinvestissement rappelait une
-- échéance sans savoir si l'argent était là ; la conservation suivait des
-- positions sans rien facturer. Les deux manquaient de la même chose : une
-- trace de ce qui s'est réellement passé sur le compte du client.
--
-- ─── La clef d'un flux ──────────────────────────────────────────────────────
--
-- « flow_key » relie un mouvement du journal à l'échéance qu'il encaisse. Sans
-- elle, l'application connaissait la date d'un coupon et jamais son arrivée :
-- elle disait donc « échu », qui est vérifié, et jamais « reçu », qui ne
-- l'était pas. Ce mot prudent tenait lieu de comptabilité.
--
-- Elle est écrite à l'enregistrement plutôt que devinée après coup. Rapprocher
-- par montant et par date confondrait deux coupons du même jour sur deux lignes
-- voisines, et une comptabilité qui devine n'est pas une comptabilité.
--
-- L'unicité est la garantie qui compte : un coupon ne s'encaisse qu'une fois.
-- Deux clics du desk sur le même bouton, ou deux passages du robot, ne peuvent
-- pas créditer deux fois le même client.
--
-- ─── La période d'un avis de garde ──────────────────────────────────────────
--
-- « fee_period » fait la même chose pour les droits de garde : un trimestre ne
-- se facture qu'une fois. Un double prélèvement est l'erreur que personne ne
-- voit passer, parce qu'elle ressemble à un fonctionnement normal.
--
-- ─── L'avis lui-même ────────────────────────────────────────────────────────
--
-- Les positions sont le registre, et tout s'en déduit : c'est vrai tant qu'on
-- regarde aujourd'hui. Un avis émis au deuxième trimestre doit rester ce qu'il
-- disait ce jour-là, même si la position a bougé depuis. Il se garde donc,
-- avec son détail ligne à ligne et le barème qui l'a produit.
--
-- Le barème, lui, n'est pas ici : il vit dans « reference », kind « policy »,
-- clef « droits-de-garde », à côté de la fenêtre déléguée et du signal
-- d'appariement. C'est une décision de maison, et elle se prend là où les
-- décisions de maison se prennent. Absent, il est fermé, et rien n'est dû.

alter table client_cash add column if not exists flow_key text;
alter table client_cash add column if not exists fee_period text;

comment on column client_cash.flow_key is
  'L''échéance que ce mouvement encaisse. C''est elle qui permet de dire « reçu » plutôt que « échu ».';
comment on column client_cash.fee_period is
  'La période de droits de garde que ce mouvement règle, « 2026-T3 ». Elle interdit le double prélèvement.';

-- Un coupon ne s'encaisse qu'une fois, un trimestre ne se facture qu'une fois.
create unique index if not exists client_cash_flow_once on client_cash (user_id, flow_key) where flow_key is not null;
create unique index if not exists client_cash_fee_once on client_cash (user_id, fee_period) where fee_period is not null;

create table if not exists custody_notices (
  id            uuid primary key default gen_random_uuid(),
  ref           text not null unique,
  user_id       uuid not null,
  client_name   text not null default '',
  -- « 2026-T3 » : un avis par client et par période, jamais deux
  period        text not null,
  period_from   date not null,
  period_to     date not null,
  -- le barème appliqué, recopié : il changera, l'avis ne doit pas changer avec lui
  bareme        jsonb not null,
  -- le détail ligne à ligne, tel qu'il a été calculé ce jour-là
  lignes        jsonb not null default '[]'::jsonb,
  assiette_moyenne numeric(18, 2) not null default 0,
  brut          numeric(18, 2) not null default 0,
  du            numeric(18, 2) not null default 0,
  raison        text,
  plancher      boolean not null default false,
  -- le mouvement du journal qui l'a prélevé, quand il y a eu prélèvement
  cash_id       uuid,
  issued_at     timestamptz not null default now(),
  issued_by     text not null default '',
  unique (user_id, period)
);

create index if not exists custody_notices_user on custody_notices (user_id, period desc);
create index if not exists custody_notices_period on custody_notices (period);

comment on table custody_notices is
  'Les avis de droits de garde émis. Un avis est ce qu''il disait le jour de son émission, pas ce que la position vaut aujourd''hui.';
comment on column custody_notices.bareme is
  'Le barème recopié au moment de l''émission : il changera, l''avis ne doit pas changer avec lui.';
comment on column custody_notices.du is
  'Ce qui est réellement dû, franchise et plancher appliqués. Zéro quand le barème de la maison est encore fermé.';

alter table custody_notices enable row level security;
-- Atteinte par le rôle de service seulement : les pages du desk et de Mon
-- espace passent par des actions serveur. Aucun accès direct depuis le
-- navigateur.

-- ─── L'instruction de réinvestissement ─────────────────────────────────────
--
-- Elle n'a pas de table à elle, et c'est un choix. Réinvestir un coupon est une
-- épargne programmée dont la source est le compte du client plutôt qu'un
-- virement : même destination fixée à la signature, même état, même décision
-- d'avance sur ce qu'on fait quand l'exécution est impossible. Lui donner sa
-- propre table aurait dupliqué le robot, les états, les garde-fous, et fait
-- diverger deux machines qui doivent se comporter pareil.
--
-- Ce qu'elle ne partage pas est son déclencheur, et « day_of_month » lui est
-- donc sans objet : un versement par virement part le jour dit, un
-- réinvestissement part quand le coupon arrive. Attendre le 5 du mois
-- laisserait l'argent dormir, ce que la politique des espèces interdit.
--
-- « source » dit d'où vient l'argent. « virement » est ce qui existait : le
-- client vire chaque mois. « encaissements » est le service 6 : on ne place que
-- ce qui est réellement arrivé, coupons et remboursements portés au journal.
-- Un robot qui placerait une échéance non encaissée engagerait un argent que la
-- maison n'a pas reçu.
alter table standing_orders add column if not exists source text not null default 'virement'
  check (source in ('virement', 'encaissements'));
alter table standing_orders add column if not exists min_amount numeric(18, 2) not null default 0
  check (min_amount >= 0);

comment on column standing_orders.source is
  'D''où vient l''argent : un virement du client, ou ses encaissements réellement portés au journal.';
comment on column standing_orders.min_amount is
  'En deçà, on ne place rien et on attend : un ordre dérisoire coûte plus qu''il ne rapporte.';

-- Le montant d'un réinvestissement n'est pas connu à la signature : il vaut ce
-- que le coupon a rapporté. La contrainte d'origine exigeait un montant
-- strictement positif, ce qui était juste tant que le virement était la seule
-- source ; elle devient conditionnelle plutôt que d'être levée, pour qu'un
-- versement par virement reste impossible à créer sans son montant.
alter table standing_orders drop constraint if exists standing_orders_amount_check;
alter table standing_orders add constraint standing_orders_amount_check
  check ((source = 'encaissements' and amount = 0) or (source = 'virement' and amount > 0));
