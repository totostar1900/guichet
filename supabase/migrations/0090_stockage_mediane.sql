-- LA PENTE SE MESURE EN MÉDIANE, PAS EN MOYENNE.
--
-- La version précédente sommait trente jours et divisait. Elle attrapait la
-- reprise historique du 14 septembre 2026, 576 Mo d'un coup, et annonçait le
-- plafond pour dans dix-sept jours alors que le rythme réel est de moins de
-- deux mégaoctets par jour : le point serait né rouge, et un point qui naît
-- rouge pour une mauvaise raison n'est jamais cru la fois d'après.
--
-- Une reprise n'est pas une pente. La médiane des additions journalières ne
-- bronche pas devant un versement unique, et c'est exactement ce qu'on veut
-- d'un estimateur sur un projet qui ingère régulièrement de l'histoire.
drop function if exists taille_du_stockage();

create function taille_du_stockage()
returns table (octets bigint, fichiers bigint, octets_par_jour bigint)
language sql
security definer
set search_path = storage, public
as $$
  with jours as (
    select generate_series((now() - interval '29 days')::date, now()::date, interval '1 day')::date as j
  ), ajouts as (
    select j, coalesce((select sum((o.metadata->>'size')::bigint) from storage.objects o where o.created_at::date = j), 0) as octets
    from jours
  )
  select
    (select coalesce(sum((metadata->>'size')::bigint), 0)::bigint from storage.objects),
    (select count(*)::bigint from storage.objects),
    (select coalesce(percentile_cont(0.5) within group (order by octets), 0)::bigint from ajouts);
$$;

comment on function taille_du_stockage is
  'Ce que pèse le stockage, le nombre de fichiers, et la MÉDIANE des octets ajoutés par jour sur trente jours. La médiane et non la moyenne : une reprise historique est un versement unique, pas une pente.';

revoke all on function taille_du_stockage() from public;
grant execute on function taille_du_stockage() to service_role;
