-- Depuis quand le cours d'une ligne cotée n'a pas bougé.
--
-- Le bulletin cote tous les jours, il ne se traite pas tous les jours : mesuré
-- sur douze mois au compartiment obligataire, 0 transaction sur 7 709 couples
-- ligne-séance, et le cours a pourtant changé 6 fois, toujours sans volume.
-- « last_price_on » est la date de la SÉANCE, donc celle d'aujourd'hui ; elle
-- ne dit rien de l'âge du prix. Cette colonne-ci ne bouge que lorsque le cours
-- change, exactement comme « last_traded_on » ne bouge que lorsqu'il y a eu un
-- échange.
alter table offers add column if not exists price_since date;

comment on column offers.price_since is
  'Date depuis laquelle last_price est inchangé. Ne bouge qu''au changement de cours, jamais à chaque séance.';

-- Reprise de l'historique déjà au dépôt : pour chaque ligne cotée, la dernière
-- séance où la clôture différait de la clôture actuelle, plus une séance.
with der as (
  select distinct on (isin) isin, close
  from quotes
  order by isin, session_date desc
), change as (
  select q.isin, max(q.session_date) as derniere_autre
  from quotes q join der d on d.isin = q.isin
  where q.close is distinct from d.close
  group by q.isin
), depuis as (
  select d.isin,
         coalesce(
           (select min(q2.session_date) from quotes q2 where q2.isin = d.isin and q2.session_date > c.derniere_autre),
           (select min(q3.session_date) from quotes q3 where q3.isin = d.isin)
         ) as price_since
  from der d left join change c on c.isin = d.isin
)
update offers o
set price_since = depuis.price_since
from depuis
where o.isin = depuis.isin and o.kind = 'MARCHE' and o.price_since is null;
