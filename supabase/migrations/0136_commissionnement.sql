-- COMMISSIONNEMENT : CE QUE LA MAISON REÇOIT DE SES PARTENAIRES NE SE LIT QUE PAR LA DIRECTION (25 novembre 2026).
--
-- 1. La rétrocession d'un fonds était rangée dans la fiche du fonds (offers.fund, clef « trailerPct »). Or la table « offers » est lisible par tout visiteur pour
--    une offre publiée (politique « offres publiées visibles », migration 0001), et la fiche part telle quelle vers le navigateur. Ce que la maison reçoit d'un
--    partenaire ne doit pas s'y trouver (règle du 14 novembre 2026). On la met à l'abri dans la table du desk (kind « trailer_historique », une ligne par offre,
--    pour que la direction la reporte dans le commissionnement), puis on la retire de la fiche. Rien n'est perdu ; rien n'est converti : la base de calcul
--    de l'ancienne valeur (part des frais de gestion ou % de l'encours) n'est pas établie, la direction la tranche en la reportant.
insert into desk_prive (kind, key, data, updated_by)
select 'trailer_historique', id, jsonb_build_object('offerId', id, 'trailerPct', fund -> 'trailerPct', 'titre', title), 'migration 0136'
from offers
where fund ? 'trailerPct' and fund -> 'trailerPct' is not null and jsonb_typeof(fund -> 'trailerPct') = 'number'
on conflict (kind, key) do nothing;

update offers set fund = fund - 'trailerPct' where fund ? 'trailerPct';

-- 2. La table du desk se resserre pour ce qui est de l'argent reçu de tiers : la direction (is_responsable(), migration 0018) seule le lit et l'écrit. Un opérateur
--    garde le reste de la table (codes porteurs, relevés des gestionnaires). Le serveur de l'application utilise la clef de service et applique les mêmes règles
--    dans le code ; cette politique protège de toute lecture directe avec le jeton d'un opérateur.
drop policy if exists "desk_prive : desk seul" on desk_prive;

create policy "desk_prive : opérateurs, hors argent de tiers" on desk_prive
  for all
  using (is_desk() and kind not in ('partenaire', 'commission_fonds', 'releve_commissionnement', 'trailer_historique', 'frais', 'recu_de_tiers'))
  with check (is_desk() and kind not in ('partenaire', 'commission_fonds', 'releve_commissionnement', 'trailer_historique', 'frais', 'recu_de_tiers'));

create policy "desk_prive : direction" on desk_prive
  for all
  using (is_responsable())
  with check (is_responsable());
