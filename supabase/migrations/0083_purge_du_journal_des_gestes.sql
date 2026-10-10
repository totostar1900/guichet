-- LA PURGE DU REGISTRE DES GESTES, PROMISE PAR L'ARTICLE 8.
--
-- Treize mois de détail, puis des compteurs sans le geste. Treize et non
-- douze : une comparaison d'une année sur l'autre doit toujours tomber dans
-- le détail, sinon le mois de référence disparaît la veille du jour où on le
-- compare.
--
-- L'AGRÉGATION ET LA SUPPRESSION SONT UN SEUL ORDRE. Deux instructions
-- séparées laisseraient, en cas d'arrêt entre les deux, soit des compteurs
-- comptés deux fois, soit des gestes perdus sans compteur. Le CTE
-- « delete ... returning » garantit que ce qui est compté est exactement ce
-- qui part.
create table if not exists client_actions_mensuel (
  user_id uuid not null references profiles (id) on delete cascade,
  mois date not null,
  genre text not null,
  n integer not null default 0,
  primary key (user_id, mois, genre)
);

comment on table client_actions_mensuel is
  'Ce qui reste du registre des gestes au-delà de treize mois : des compteurs par mois et par famille, sans le geste.';

alter table client_actions_mensuel enable row level security;

drop policy if exists "client lit ses compteurs" on client_actions_mensuel;
create policy "client lit ses compteurs" on client_actions_mensuel for select using (auth.uid() = user_id);

create or replace function purger_gestes(avant timestamptz)
returns integer
language sql
security definer
set search_path = public
as $$
  with partis as (
    delete from client_actions where at < avant
    returning user_id, date_trunc('month', at)::date as mois, genre
  ), comptes as (
    select user_id, mois, genre, count(*)::int as n from partis group by 1, 2, 3
  ), pose as (
    insert into client_actions_mensuel (user_id, mois, genre, n)
    select user_id, mois, genre, n from comptes
    on conflict (user_id, mois, genre) do update set n = client_actions_mensuel.n + excluded.n
    returning n
  )
  select coalesce(sum(n), 0)::int from pose;
$$;

comment on function purger_gestes is
  'Compte puis supprime les gestes antérieurs à « avant », en un seul ordre. Rend le nombre de gestes résumés.';
