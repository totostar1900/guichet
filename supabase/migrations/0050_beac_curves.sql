-- La courbe que la BEAC publie, relevée dans son bulletin mensuel.
--
-- Elle paraît page 5 des « Statistiques Mensuelles du Marché des valeurs du
-- Trésor de la CEMAC », pour trois Trésors seulement : Cameroun, Congo, Gabon.
-- Elle est publiée comme un graphique, sans table et sans note de méthode : ces
-- chiffres ne sont donc pas recopiés d'une source chiffrée, ils sont relevés
-- dans le tracé vectoriel du PDF et ramenés en pour cent par les graduations de
-- son axe. D'où « releve_le » et « source », sans lesquels un chiffre de cette
-- table n'a pas de provenance vérifiable.
--
-- Une ligne par bulletin. Le numéro fait la clef : un bulletin ne se republie
-- pas, et le relire ne doit rien dupliquer.

create table if not exists beac_curves (
  numero      integer primary key,
  mois        text        not null,
  source      text        not null,
  releve_le   timestamptz not null default now(),
  -- Les séries telles que relevées : [{ pays, points: [{ annees, pct }] }].
  -- Du JSON plutôt que trois tables, parce que rien ici ne se joint ni ne se
  -- filtre : cette courbe se lit en entier ou pas du tout.
  series      jsonb       not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table  beac_curves is 'La courbe des taux publiée par la BEAC dans ses statistiques mensuelles, relevée dans le tracé vectoriel de son PDF faute de table publiée. Sert de repère à côté de la nôtre, jamais de source de chiffres.';
comment on column beac_curves.numero    is 'Le numéro du bulletin, tel qu''il se nomme. Clef : un bulletin ne se republie pas.';
comment on column beac_curves.mois      is 'Le mois arrêté, en AAAA-MM. C''est la date de la courbe, pas celle du relevé.';
comment on column beac_curves.source    is 'L''adresse du PDF relevé : sans elle le chiffre n''a pas de provenance.';
comment on column beac_curves.releve_le is 'Le jour où nous avons relevé le tracé. Deux mois séparent d''ordinaire le mois arrêté de sa parution.';
comment on column beac_curves.series    is 'Les séries relevées : [{ pays, points: [{ annees, pct }] }]. Les durées sont des durées d''ÉMISSION, pas des vies restantes : la BEAC range autrement que nous.';

create index if not exists beac_curves_mois_idx on beac_curves (mois desc);

alter table beac_curves enable row level security;
