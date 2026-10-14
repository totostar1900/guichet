-- LES TROUS DE LA SERIE D ENCOURS, COMPTES EN BASE.
--
-- Une ligne absente d une seance fait baisser le total EXACTEMENT comme une
-- extinction de dette, et les confondre ferait publier une courbe qui descend
-- quand c est la lecture qui a lache. L alerte du desk a donc besoin de ce
-- compte a chaque affichage.
--
-- EN SQL ET NON EN JAVASCRIPT : le faire cote application demande de
-- transferer les 17 713 releves a chaque rendu de page pour n en tirer trois
-- nombres. Ici le calcul reste ou vivent les donnees.
--
-- « Attendu » veut dire : entre la premiere et la derniere apparition de la
-- ligne. Avant sa premiere cotation et apres son echeance, son absence n est
-- pas un trou, c est sa vie.
create or replace function public.trous_encours()
returns table (manquants bigint, attendus bigint, seances_trouees bigint)
language sql
stable
security definer
set search_path = public
as $$
  with bornes as (
    select isin, min(session_date) as d1, max(session_date) as d2
    from public.debt_outstandings group by isin
  ),
  seances as (select distinct session_date from public.debt_outstandings),
  attendu as (
    select b.isin, s.session_date
    from bornes b join seances s on s.session_date between b.d1 and b.d2
  ),
  manque as (
    select a.isin, a.session_date
    from attendu a
    left join public.debt_outstandings d
      on d.isin = a.isin and d.session_date = a.session_date
    where d.isin is null
  )
  select (select count(*) from manque),
         (select count(*) from attendu),
         (select count(distinct session_date) from manque);
$$;

comment on function public.trous_encours is
  'Releves d encours attendus et manquants. « Attendu » = entre la premiere et la derniere apparition de la ligne.';

revoke all on function public.trous_encours() from public;
grant execute on function public.trous_encours() to service_role;
