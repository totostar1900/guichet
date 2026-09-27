-- Les avis d'annonce : là où le Trésor écrit les modalités de son emprunt.
--
-- Nous ingérions les communiqués de résultats et rien d'autre. Ils disent qui a
-- acheté quoi et à quel prix ; ils ne disent jamais comment le titre se
-- rembourse, ni combien il en a été émis, ni quand il se règle. Toutes ces
-- choses sont sur un second document, publié une semaine avant la séance, que
-- la BEAC range dans le même index sous « Communiqué d'annonce » et que nous
-- laissions passer.
--
-- Ce que cela a coûté : le rendement de deux abondements congolais ressortait à
-- 15 et 17 % sur dix-huit mois, et nous ne savions pas dire si c'était le prix
-- d'une signature ou un artefact de notre hypothèse d'amortissement. La réponse
-- tenait en une ligne d'un avis d'annonce, « Remboursement : In fine », qu'il a
-- fallu aller chercher à la main.
--
-- Une ligne par document, et non par ligne d'emprunt. C'est le même parti pris
-- que pour les résultats : on recopie une pièce, fidèlement, et le regroupement
-- se fait dans le code. Un abondement republie un avis pour un code d'émission
-- déjà connu, et les deux avis doivent dire la même chose ; s'ils divergent,
-- c'est une contradiction à montrer, pas une valeur à écraser.
--
-- « redemption » garde le texte imprimé plutôt qu'un booléen. « In fine » est
-- ce qu'on lit aujourd'hui sur les six Trésors, mais un amortissement par
-- tranches après différé s'écrirait en toutes lettres, et un booléen aurait
-- déjà jeté la phrase qui permet de le comprendre.
--
-- La confirmation existe ici comme ailleurs : ces champs nourrissent un
-- rendement, donc une référence donnée à un client. Une lecture automatique ne
-- devient une modalité qu'une fois qu'une personne a ouvert la pièce.

create table if not exists emission_notices (
  id            uuid primary key default gen_random_uuid(),
  source_url    text not null unique,
  source_title  text not null,
  file_key      text,

  country       text not null,
  instrument    text not null,
  tenor         text,
  -- La séance que l'avis annonce, telle que l'index de la BEAC la date.
  session_on    date not null,
  abondement    boolean not null default false,

  code_emission text,
  maturity_on   date,
  coupon_rate   numeric(9,4),
  redemption    text,
  nominal_unit  numeric(18,2),
  issue_volume  numeric(20,2),
  settle_on     date,

  read_at       timestamptz,
  read_model    text,
  remarks       text[] not null default '{}',

  confirmed_by  text,
  confirmed_at  timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists emission_notices_code_idx    on emission_notices (code_emission);
create index if not exists emission_notices_session_idx on emission_notices (country, session_on desc);

comment on table  emission_notices is 'Les communiqués d''annonce de la BEAC, une ligne par document. Ils portent les modalités de l''emprunt, que le communiqué de résultats ne donne jamais.';
comment on column emission_notices.source_url    is 'L''adresse du document chez la BEAC : la pièce est l''avis, et on ne saisit pas deux fois la même.';
comment on column emission_notices.session_on    is 'La séance annoncée, datée par l''index de la BEAC et non par la lecture du scan.';
comment on column emission_notices.code_emission is 'Le code de la ligne empruntée, ex. CG2K00000187. C''est lui qui rattache l''avis aux séances.';
comment on column emission_notices.maturity_on   is 'Échéance imprimée sur l''avis.';
comment on column emission_notices.coupon_rate   is 'Le taux facial, imprimé sous « Rendement : 6,20 % du nominal ». C''est un coupon, pas un rendement de marché, quel que soit le libellé du Trésor.';
comment on column emission_notices.redemption    is 'La mention « Remboursement » recopiée telle quelle : « In fine », ou l''amortissement décrit en toutes lettres. Jamais un booléen : la phrase porte ce qu''un oui/non jetterait.';
comment on column emission_notices.nominal_unit  is 'Valeur nominale unitaire en FCFA, 10 000 sur toute la zone à ce jour. Elle sert à convertir un prix imprimé en francs.';
comment on column emission_notices.issue_volume  is 'Volume d''émission en FCFA, ramené en francs à l''écriture.';
comment on column emission_notices.settle_on     is 'Date de règlement : le jour où le titre est livré, deux jours après la séance en général.';
comment on column emission_notices.read_at       is 'Marque de lecture, écrite que la lecture ait donné quelque chose ou non : une pièce dont on ne tire rien est un fait, pas une tentative à recommencer.';
comment on column emission_notices.confirmed_by  is 'Ces modalités nourrissent un rendement : elles ne servent de référence qu''une fois relues par une personne.';

alter table emission_notices enable row level security;
