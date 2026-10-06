-- LES MOUVEMENTS DE LA COTE, UNE SÉANCE À LA FOIS, EN UNE SEULE REQUÊTE.
--
-- La frise du comparateur doit dire, pour chaque mois, combien de séances
-- portent un vrai mouvement : une ligne qui entre dans la cote ou qui en sort.
-- Sans quoi on choisit un couple au hasard parmi huit cents.
--
-- POURQUOI PAS LE COMPTE DE LIGNES. Il servait de raccourci : si le bulletin
-- compte une action de moins, c'est qu'une ligne est partie. Mesuré le
-- 6 octobre 2026 sur les 807 couples consécutifs : 74 portent un vrai
-- mouvement, le raccourci en signalait 40 dont 6 sans aucun mouvement. Il en
-- attrapait 34, soit 46 %, et en ratait 40. Un repère qui rate plus de la
-- moitié de ce qu'il désigne donne une fausse confiance, ce qui est pire que
-- de ne rien montrer. Il a été retiré.
--
-- La différence exacte d'ensembles, elle, tient ici. Je la croyais trop
-- coûteuse — vingt-deux mille cotations à charger — mais la base la fait
-- elle-même en un passage sur deux fois ce nombre de lignes.
--
-- L'INDEX EST LA MOITIÉ DU TRAVAIL. Les deux index existants commencent par
-- l'ISIN, donc aucun ne sert à chercher par date : il manquait le sens
-- inverse, sans lequel chaque séance balaierait toute la table.

create index if not exists quotes_date_isin on quotes (session_date, isin);

create or replace function public.market_movements()
returns table (session_date date, prev_date date, partis int, arrivees int)
language sql
stable
as $$
  with seances as (
    select distinct q.session_date as d from quotes q
  ),
  paires as (
    -- La veille est la séance PRÉCÉDENTE DE LA SÉRIE, pas le jour d'avant :
    -- la bourse ne cote pas tous les jours, et la veille d'un lundi est un
    -- vendredi.
    select d, prev from (
      select d, lag(d) over (order by d) as prev from seances
    ) x
    -- LA PREMIÈRE SÉANCE DE LA SÉRIE N'EST PAS UN MOUVEMENT, c'est un début.
    -- Sans ce filtre elle sortait avec toutes ses lignes comptées comme des
    -- arrivées, et la frise aurait allumé mars 2023 pour rien.
    where prev is not null
  ),
  -- Les deux cotes d'un couple, empilées, chaque ISIN marqué du côté d'où il
  -- vient. Un ISIN présent des deux côtés donnera deux lignes ici.
  deux_cotes as (
    select p.d, p.prev, q.isin, true as avant, false as apres
      from paires p join quotes q on q.session_date = p.prev
    union all
    select p.d, p.prev, q.isin, false, true
      from paires p join quotes q on q.session_date = p.d
  ),
  par_ligne as (
    select d, prev, isin, bool_or(avant) as etait, bool_or(apres) as est
    from deux_cotes
    group by d, prev, isin
  )
  select d, prev,
         count(*) filter (where etait and not est)::int,
         count(*) filter (where est and not etait)::int
  from par_ligne
  group by d, prev
  order by d;
$$;

comment on function public.market_movements() is
  'Par séance : combien de lignes ont quitté la cote depuis la précédente de la série, et combien y sont entrées. Le compte de lignes du bulletin ne vaut pas ce calcul, mesuré à 46 % de rappel.';
