-- CE QUE LA BASE PORTE, POUR QUE SANTÉ PUISSE LE COMPARER AU DÉPÔT.
--
-- RELEVÉ LE 27 OCTOBRE 2026, et il a coûté quatre jours de panne. Sept
-- migrations étaient restées non appliquées pendant que le code qui en
-- dépendait tournait en production, et les trois conséquences ne se lisaient
-- pas au même endroit : les relances criaient dans les journaux de Vercel, que
-- personne n'ouvre tous les matins ; l'arbitrage et le sondage ne criaient PAS
-- — leurs robots levaient au premier appel, l'enveloppe inscrivait l'échec, et
-- la page Santé montrait des robots en bonne santé puisqu'ils avaient bien
-- tourné. La borne qu'un client signe ne jouait pas, et rien nulle part ne
-- disait pourquoi.
--
-- Douze contrôles veillaient sur la donnée de marché ; aucun ne regardait la
-- base. La panne la plus confortable de la maison vivait dans l'outil qui sert
-- à les traquer.
--
-- POURQUOI LE SCHÉMA ET NON LE REGISTRE DES MIGRATIONS. Les premières
-- migrations ont été passées à la main et ne figurent pas dans
-- « supabase_migrations.schema_migrations », et les noms enregistrés divergent
-- de ceux du dépôt. Un contrôle qui le lirait annoncerait cinquante migrations
-- manquantes qui sont toutes en place, et un point rouge permanent ne se lit
-- plus. On lit donc les catalogues.
--
-- information_schema et pg_* ne sont pas exposés par PostgREST : une fonction
-- en security definer est le chemin propre, comme pour « taille_du_stockage ».
-- Elle ne rend que des NOMS d'objets — aucune donnée de client, aucune ligne de
-- table — et elle n'est atteignable que par le rôle de service.
--
-- ELLE NE REND QUE « public ». Les schémas de Supabase (auth, storage, realtime)
-- ne sont pas décrits par nos migrations, et les rendre ferait comparer ce que
-- le dépôt ne déclare pas.
create or replace function objets_du_schema()
returns table (genre text, nom text)
language sql
security definer
set search_path = public, pg_catalog
as $$
  -- Les tables ordinaires, sans les vues ni les tables système.
  select 'table'::text, c.relname::text
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
  union all
  -- « table.colonne » : la forme que le relevé du dépôt emploie.
  select 'colonne'::text, (c.relname || '.' || a.attname)::text
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and a.attnum > 0 and not a.attisdropped
  union all
  select 'index'::text, c.relname::text
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'i'
  union all
  -- « type.valeur », pour les énumérations que nos migrations déclarent.
  select 'valeur'::text, (t.typname || '.' || e.enumlabel)::text
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
   where n.nspname = 'public';
$$;

comment on function objets_du_schema is
  'Les noms des tables, colonnes, index et valeurs d''énumération du schéma public. Sert au point « Schéma » de Santé, qui les compare à ce que les migrations du dépôt déclarent : une migration oubliée se voit alors le jour même, et non quatre matins plus tard dans les journaux d''un autre service.';

revoke all on function objets_du_schema() from public;
grant execute on function objets_du_schema() to service_role;
