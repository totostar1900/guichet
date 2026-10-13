-- L'encours des titres de dette, tel que le bulletin le publie à chaque séance.
--
-- POURQUOI CETTE TABLE ET PAS UN CALCUL. Nous avons déjà les adjudications, qui
-- donnent des FLUX : untel a levé tant, tel jour. Notre collecte n'en couvre
-- qu'un quart, et un encours reconstitué à partir d'un quart des flux est
-- faussement précis : il a l'air d'un chiffre alors qu'il est une hypothèse. La
-- seconde table du bulletin publie le STOCK, ligne par ligne, et un stock
-- publié est complet par construction. C'est la seule route honnête vers le mur
-- des échéances tant que la collecte des adjudications reste partielle.
--
-- UNE LIGNE PAR SÉANCE ET PAR ISIN, le relevé entier à chaque fois. On aurait
-- pu n'écrire que ce qui bouge, comme pour le journal des annonces de la BEAC,
-- et ce serait une erreur ici : là-bas on gardait la trace d'une page qui ne
-- montre que son état courant, ici c'est la SÉRIE qui est le produit. Le cours
-- et l'encours changent presque chaque séance, et c'est précisément leur
-- mouvement qu'on veut tracer. Huit cent treize séances par une trentaine de
-- lignes font vingt-cinq mille lignes : rien, et la requête reste triviale.
--
-- CE QUE LA RANGÉE GARANTIT D'ELLE-MÊME. Aucune ligne n'entre ici sans que
-- titres × nominal_residuel × cours / 100 = encours tombe à une unité du
-- dernier décimal près. C'est le seul garde contre la grille du PDF, qui coupe
-- les nombres en deux ; il est dans le lecteur, et ce commentaire est là pour
-- que personne n'écrive dans cette table par un autre chemin.
--
-- CE QU'ELLE NE SAIT PAS, écrit maintenant plutôt que découvert plus tard : le
-- DIFFÉRÉ d'amortissement n'est pas publié. Quand nominal_remaining vaut encore
-- le nominal d'origine sur une ligne déjà vieille, un différé court, et aucune
-- colonne d'ici ne dit jusqu'à quand. Un échéancier bâti sur ces seules données
-- est donc une hypothèse pour ces lignes-là ; le vrai calendrier est dans la
-- note d'information, et il se saisit à la main, une fois par ligne.

create table if not exists debt_outstandings (
  session_date       date not null,
  isin               text not null,

  mnemo              text,
  issuer             text not null,
  designation        text not null,

  coupon_rate        numeric(9,4),
  first_listed_on    date,
  amount_raised      numeric(20,2),

  units              bigint not null,
  nominal_remaining  numeric(18,3) not null,
  price_pct          numeric(9,4) not null,
  outstanding        numeric(20,2) not null,

  maturity_years     numeric(6,2),
  amortisation       text,
  periodicity        text,
  previous_coupon_on date,
  next_coupon_on     date,

  net_yield_pct      numeric(9,4),
  turnover_pct       numeric(9,4),

  -- La version du lecteur qui a écrit la ligne : une relecture se cible.
  reader_version     int,
  created_at         timestamptz not null default now(),

  primary key (session_date, isin)
);

create index if not exists debt_outstandings_isin_idx     on debt_outstandings (isin, session_date desc);
create index if not exists debt_outstandings_issuer_idx   on debt_outstandings (issuer, session_date desc);
create index if not exists debt_outstandings_maturity_idx on debt_outstandings (session_date, next_coupon_on);

comment on table  debt_outstandings is 'L''encours des titres de dette cotés, relevé entier à chaque séance du bulletin. Le STOCK publié, par opposition aux flux d''adjudication que nous ne collectons qu''en partie.';
comment on column debt_outstandings.issuer             is 'L''émetteur seul, séparé de la désignation : le bulletin les colle parfois dans une même cellule, et un émetteur par ligne au lieu d''un par maison rendrait tout regroupement faux.';
comment on column debt_outstandings.nominal_remaining  is 'Le nominal RÉSIDUEL, qui décroît avec l''amortissement : c''est lui, et non le nominal d''origine, qui porte le coupon et l''encours. Trois décimales parce que ALIOS-06 vaut 8888,889.';
comment on column debt_outstandings.price_pct          is 'Le cours en pourcentage du nominal résiduel. Vingt-cinq lignes sur trente-deux sont au pair ; supposer le pair était l''erreur qui refusait dix-huit rangées sur trente et une.';
comment on column debt_outstandings.outstanding        is 'La colonne « Encours calculé à ce jour » : titres × nominal résiduel × cours / 100. Elle est recopiée du document, et c''est son égalité avec le produit qui autorise la ligne à entrer.';
comment on column debt_outstandings.amortisation       is 'CONSTANT, IN FINE, DIFFÉRÉ, LINÉAIRE : le texte imprimé, jamais un code. La mention porte ce qu''un code jetterait.';
comment on column debt_outstandings.previous_coupon_on is 'Avec next_coupon_on, les deux bornes qui donnent le coupon couru sans aucune hypothèse de calendrier.';
comment on column debt_outstandings.net_yield_pct      is 'Le rendement net imprimé par le bulletin. Il ne coïncide pas toujours avec un rendement actuariel calculé sur les flux réels : la divergence est à instruire, pas à écraser.';
comment on column debt_outstandings.reader_version     is 'La version du lecteur qui a écrit la ligne, pour qu''une relecture sache ce qu''elle a à gagner.';

alter table debt_outstandings enable row level security;
