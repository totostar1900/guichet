-- Les résultats des adjudications de la zone, séance par séance.
--
-- Le taux d'un bon sort de l'adjudication : l'émetteur ne l'impose pas, et la
-- maison ne le décide pas. Le chiffre qu'elle affiche avant une séance est donc
-- une indication, et une indication se fonde sur ce que le marché vient de
-- payer. Sans mémoire de ce qui s'est payé, elle se fonde sur une intuition.
--
-- La BEAC publie ces résultats pour les six Trésors, et nous n'avons publié comme
-- offres qu'une poignée des lignes concernées. Cette table n'est donc pas une
-- colonne de plus sur « offers » : c'est l'histoire du marché primaire de la
-- zone, dont nos propres lignes ne sont qu'un extrait.
--
-- Quatre choix qui méritent d'être écrits.
--
--   Les montants sont en francs, pas en millions. Le communiqué imprime
--   « 15 000 » pour quinze milliards, et cette unité-là a déjà coûté assez cher
--   partout où elle voyage. La conversion se fait à la saisie, une fois.
--
--   Les bons portent des taux, les obligations des prix : deux familles, deux
--   séries de colonnes, et rien n'est ramené de force à un chiffre unique.
--   Convertir un prix en rendement demande le coupon et l'échéancier, et ce
--   calcul appartient au code financier, pas au stockage.
--
--   « coverage » est recopié du communiqué plutôt que recalculé. Le Trésor
--   publie son propre taux de couverture ; le recalculer à partir des montants
--   donnerait parfois un chiffre différent du sien, et c'est le sien qui fait foi.
--
--   « source_url » est unique. Le communiqué est la pièce : deux lignes pour un
--   même document voudraient dire qu'on a saisi deux fois la même séance.
--
-- Enfin, « bidders » et « coverage » ne sont pas de la décoration. Une séance
-- servie à 6,97 % où un seul spécialiste a soumissionné 250 millions contre
-- 10 milliards annoncés n'est pas un prix de marché, c'est une impression isolée.
-- L'écran qui propose un taux indicatif doit les montrer à côté du taux, sinon le
-- desk s'ancre sur un chiffre qu'une seule banque a posé.

create table if not exists auction_results (
  id             uuid primary key default gen_random_uuid(),
  -- Le code d'émission du Trésor : c'est lui qui relie la séance à une ligne.
  code_emission  text not null,
  country        text not null,
  instrument     text not null check (instrument in ('BTA', 'OTA')),
  tenor          text not null,
  session_on     date not null,
  abondement     boolean not null default false,

  -- En francs. Le communiqué les imprime en millions.
  announced      numeric(20, 2),
  bid            numeric(20, 2),
  served         numeric(20, 2),
  network_size   smallint,
  bidders        smallint,

  -- Les bons : des taux précomptés, en pourcentage.
  rate_min       numeric(6, 3),
  rate_max       numeric(6, 3),
  rate_limit     numeric(6, 3),
  rate_avg       numeric(6, 3),

  -- Les obligations : des prix, en pourcentage du nominal.
  price_min      numeric(7, 3),
  price_max      numeric(7, 3),
  price_limit    numeric(7, 3),
  price_avg      numeric(7, 3),

  -- Tel que le Trésor le publie.
  coverage       numeric(7, 2),

  source_url     text not null unique,
  source_title   text not null,

  -- La lecture est proposée par la machine et arrêtée par une personne : tant que
  -- « confirmed_by » est vide, le chiffre n'a pas été relu et ne sert de référence
  -- à rien.
  confirmed_by   text,
  confirmed_at   timestamptz,

  offer_id       text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Le comparable d'une séance à venir : même instrument, même durée, la plus récente.
create index if not exists auction_results_comparable
  on auction_results (instrument, tenor, session_on desc);
-- Toutes les séances d'une ligne, pour la rattacher à une offre et suivre sa vie.
create index if not exists auction_results_code on auction_results (code_emission);
create index if not exists auction_results_offer on auction_results (offer_id) where offer_id is not null;
-- Ce qui reste à relire.
create index if not exists auction_results_unconfirmed on auction_results (session_on desc) where confirmed_by is null;

comment on column auction_results.announced is 'Montant annoncé par le Trésor, en FCFA (le communiqué l''imprime en millions).';
comment on column auction_results.coverage is 'Taux de couverture tel que le Trésor le publie, jamais recalculé.';
comment on column auction_results.confirmed_by is 'Qui a relu la lecture automatique. Vide : le chiffre ne sert de référence à rien.';

alter table auction_results enable row level security;
-- Atteinte par le rôle de service seulement : le robot d'indexation, l'écran de
-- relecture du desk et les pages qui en dérivent. Aucun accès direct du navigateur.
