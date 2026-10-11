-- COMBIEN PÈSE LE STOCKAGE, ET DEPUIS QUAND IL GROSSIT.
--
-- Le plan gratuit plafonne à un gigaoctet. La décision d'y rester a été
-- prise en connaissance de cause le 11 octobre 2026 ; ce qu'il ne faut pas,
-- c'est que le plafond arrive sans prévenir. Santé a besoin de deux
-- nombres : ce qui est occupé, et ce qui s'ajoute chaque jour.
--
-- storage.objects n'est pas exposé par PostgREST : une fonction en security
-- definer est le chemin propre, et elle ne rend que des agrégats.
create or replace function taille_du_stockage()
returns table (octets bigint, fichiers bigint, octets_30j bigint)
language sql
security definer
set search_path = storage, public
as $$
  select
    coalesce(sum((metadata->>'size')::bigint), 0)::bigint as octets,
    count(*)::bigint as fichiers,
    coalesce(sum((metadata->>'size')::bigint) filter (where created_at > now() - interval '30 days'), 0)::bigint as octets_30j
  from storage.objects;
$$;

comment on function taille_du_stockage is
  'Ce que pèse le stockage, en octets, et ce qui s''y est ajouté sur trente jours. Sert au point de Santé qui annonce le plafond du plan avant qu''il ne tombe.';

revoke all on function taille_du_stockage() from public;
grant execute on function taille_du_stockage() to service_role;
