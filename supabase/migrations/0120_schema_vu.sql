-- LE SCHÉMA EN UNE SEULE LIGNE, PARCE QU'UNE LISTE SE FAIT COUPER.
--
-- RELEVÉ LE 27 OCTOBRE 2026 AU SOIR, au premier vrai passage du contrôle posé
-- la veille. Le point « Schéma » a annoncé 228 objets manquants. AUCUN NE
-- MANQUAIT : douze objets pris au hasard dans la liste attendue — index,
-- colonnes, valeurs d'énumération, dont « event_kind.avis_manque » — ont été
-- demandés un par un à la base, et les douze étaient là.
--
-- CE QUI SE PASSAIT. « objets_du_schema() » rend UNE LIGNE PAR OBJET, et la
-- base en porte 1 307. La réponse de PostgREST s'arrête à mille lignes. Le
-- client recevait donc 58 tables, 938 colonnes, 4 index et ZÉRO valeur
-- d'énumération, et le contrôle, qui ne sait pas distinguer « absent » de
-- « non lu », appelait les 230 index et valeurs restants une migration
-- oubliée. Deux des quatre index vus figuraient dans la liste attendue :
-- 230 − 2 = 228, le compte annoncé, à l'unité.
--
-- L'IRONIE EST LE SUJET MÊME DU CONTRÔLE : il a été écrit pour qu'une panne
-- silencieuse cesse de l'être, et sa première sortie en production a été un
-- cri sans cause. Un rouge permanent ne se lit plus, et un faux rouge dans le
-- courriel du soir use plus vite l'attention du desk qu'un point absent.
--
-- POURQUOI UNE LIGNE ET NON UNE PAGINATION. On peut lire mille lignes à la
-- fois et boucler. Mais le défaut n'était pas le nombre : c'est qu'une lecture
-- tronquée RESSEMBLE à une lecture complète. Une boucle demande d'avoir raison
-- à chaque tour, et se trompera un jour dans le même silence. UNE SEULE LIGNE
-- ne peut pas être coupée en deux : la sécurité vient de la forme, pas de la
-- vigilance. Les quatre tableaux voyagent dans un seul enregistrement.
--
-- POURQUOI UN NOUVEAU NOM, ET NON LA MÊME FONCTION REFAITE. Entre le passage
-- de cette migration et le déploiement du code qui l'appelle, l'ancien code
-- tourne encore. S'il recevait soudain la nouvelle forme sous l'ancien nom, il
-- ne lirait plus aucun genre et annoncerait 432 objets manquants — un faux
-- rouge PIRE que celui qu'on répare. Avec un nom neuf, l'ancien chemin garde
-- son défaut connu jusqu'au déploiement, et pas une minute de plus.
-- « objets_du_schema() » n'a plus d'appelant ensuite : elle se retire dans une
-- migration à elle, une fois le déploiement passé.
--
-- Elle ne rend que des NOMS d'objets du schéma « public » — aucune donnée de
-- client, aucune ligne de table — et n'est atteignable que par le rôle de
-- service, comme sa devancière.
create or replace function schema_vu()
returns table (tables text[], colonnes text[], "index" text[], valeurs text[])
language sql
security definer
set search_path = public, pg_catalog
as $$
  select
    -- Les tables ordinaires, sans les vues ni les tables système.
    (select coalesce(array_agg(c.relname::text), '{}'::text[])
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'),
    -- « table.colonne » : la forme que le relevé du dépôt emploie.
    (select coalesce(array_agg((c.relname || '.' || a.attname)::text), '{}'::text[])
       from pg_attribute a
       join pg_class c on c.oid = a.attrelid
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and a.attnum > 0 and not a.attisdropped),
    (select coalesce(array_agg(c.relname::text), '{}'::text[])
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'i'),
    -- « type.valeur », pour les énumérations que nos migrations déclarent.
    (select coalesce(array_agg((t.typname || '.' || e.enumlabel)::text), '{}'::text[])
       from pg_enum e
       join pg_type t on t.oid = e.enumtypid
       join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public');
$$;

comment on function schema_vu is
  'Les noms des tables, colonnes, index et valeurs d''énumération du schéma public, en UNE ligne portant quatre tableaux. Remplace « objets_du_schema() », qui en rendait une par objet : les 1 307 lignes se faisaient couper à mille par PostgREST, et le point « Schéma » de Santé prenait les 228 non lus pour des objets manquants.';

revoke all on function schema_vu() from public;
grant execute on function schema_vu() to service_role;
