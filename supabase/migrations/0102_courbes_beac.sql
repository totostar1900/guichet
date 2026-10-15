-- LA COURBE QUE LA BEAC PUBLIE, ET QUE NOUS NE LISIONS PAS.
--
-- Deux cent soixante-dix-sept feuilles mensuelles dorment depuis 2015 dans la
-- bibliotheque : une par pays, plus une feuille de zone qui en porte trois a la
-- fois. Georges l a releve le 15 octobre 2026, et c etait exact : plusieurs
-- courbes par document, et aucune dans nos tables.
--
-- CE N EST PAS NOTRE COURBE, ET LES DEUX DOIVENT VIVRE COTE A COTE. La notre
-- sort des adjudications que nous avons lues ; celle-ci sort du calcul de la
-- banque centrale, sur un perimetre qu elle ne detaille pas. Les confondre
-- ferait disparaitre la question interessante, qui est leur ecart.
--
-- CHAQUE POINT CITE SA PIECE. `source_chemin` dit ou le document est range dans
-- la bibliotheque et `file_key` donne le lien que le desk sert : un chiffre dont
-- on ne peut plus ouvrir la source n est pas une mesure, c est un souvenir.
create table if not exists public.beac_yield_curves (
  id uuid primary key default gen_random_uuid(),
  -- Le premier du mois : la BEAC publie par mois, jamais par jour.
  mois date not null,
  pays text not null,
  -- La duree telle que l axe l ecrit (« 3 mois », « 1,5 ans »), et la meme en
  -- annees. On garde les deux : l une est ce que la piece dit, l autre est ce
  -- qui permet de trier et de comparer.
  tenor text not null,
  annees numeric not null,
  taux numeric not null,
  source_titre text,
  source_chemin text,
  file_key text,
  -- Ce que la lecture n a pas pu affirmer. Vide quand tout est net.
  reserves text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- UN SEUL POINT PAR MOIS, PAR PAYS ET PAR DUREE. Une feuille republiee se
-- remplace, elle ne s ajoute pas.
create unique index if not exists beac_yield_curves_point
  on public.beac_yield_curves (mois, pays, tenor);

create index if not exists beac_yield_curves_pays_mois
  on public.beac_yield_curves (pays, mois desc);

alter table public.beac_yield_curves enable row level security;
