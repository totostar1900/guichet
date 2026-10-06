-- RÉPARATION PONCTUELLE, À PASSER À LA MAIN DANS L'ÉDITEUR SQL.
--
-- https://supabase.com/dashboard/project/sernniidkjkwqromvmqu/sql/new
--
-- CE N'EST PAS UNE MIGRATION, et c'est voulu : une migration s'applique à
-- tous les environnements, or ces lignes-ci n'existent que dans celui de
-- production. Le dossier garde la trace du geste, pas une étape du schéma.
--
-- LE DÉFAUT. Le 7 août 2023 la bourse a écrit, DANS LE MÊME BULLETIN,
-- « FCP BGFI Bank ATLAS » à la table quotidienne et « FCP BGFIBank ATLAS » à
-- l'hebdomadaire. La clef d'un fonds se fabriquant de son nom, une espace a
-- suffi à en créer deux le même jour. Dès le 9 août la bourse n'écrivait plus
-- qu'une orthographe : le vrai fonds a poursuivi sa série (131 VL jusqu'au
-- 25 septembre 2026), le jumeau est resté PUBLIÉ avec la VL de ce jour-là.
-- Un client voyait donc le même fonds deux fois, dont une au prix de 2023.
--
-- LA CAUSE EST FERMÉE depuis le commit bd41999 : à l'ingestion, un nom qui
-- donne la même suite de lettres et de chiffres qu'un fonds connu reprend SA
-- clef. Reste à retirer le jumeau né avant ce correctif.
--
-- CE QU'ON NE PERD PAS. L'unique VL du jumeau est le doublon exact de celle
-- du vrai fonds à la même date, et rien ne s'accroche à lui : zéro intention,
-- zéro ordre permanent, zéro suivi, zéro document, zéro notification.
-- Vérifié le 6 octobre 2026.

-- ÉTAPE 1 — CONSTATER. Ne modifie rien. Les deux premières lignes doivent
-- porter la même date et la même valeur : 2023-08-04 et 103558.08. Si ce
-- n'est pas le cas, s'arrêter ici.
select 'VL du jumeau' as quoi, fund_key as clef, name, nav_date::text as detail, nav::text as valeur
  from fund_navs where fund_key = 'fcp-bgfi-bank-atlas'
union all
select 'VL du vrai fonds, meme date', fund_key, name, nav_date::text, nav::text
  from fund_navs where fund_key = 'fcp-bgfibank-atlas' and nav_date = '2023-08-04'
union all
select 'offre publiee du jumeau', id, title, status::text, fund->>'navDate'
  from offers where id = 'fund-fcp-bgfi-bank-atlas'
union all
select 'versions du jumeau', offer_id, '', count(*)::text, ''
  from offer_versions where offer_id = 'fund-fcp-bgfi-bank-atlas' group by offer_id;

-- ÉTAPE 2 — SUPPRIMER. L'ordre suit les dépendances : les versions, l'offre,
-- puis la VL. Le compte au milieu doit afficher 0, 0, 0 ; sinon remplacer
-- « commit » par « rollback » et rien n'aura été écrit.
begin;

delete from offer_versions where offer_id = 'fund-fcp-bgfi-bank-atlas';
delete from offers         where id       = 'fund-fcp-bgfi-bank-atlas';
delete from fund_navs      where fund_key = 'fcp-bgfi-bank-atlas';

select
  (select count(*) from offer_versions where offer_id = 'fund-fcp-bgfi-bank-atlas') as versions,
  (select count(*) from offers         where id       = 'fund-fcp-bgfi-bank-atlas') as offres,
  (select count(*) from fund_navs      where fund_key = 'fcp-bgfi-bank-atlas')      as vl;

commit;

-- ÉTAPE 3 — VÉRIFIER. Une seule ligne doit rester : fund-fcp-bgfibank-atlas,
-- publiée, VL du 2026-09-25, 131 valeurs connues.
select o.id, o.title, o.status::text, o.fund->>'navDate' as vl_date,
       (select count(*) from fund_navs n where n.fund_key = o.fund->>'key') as vl_connues
from offers o where o.kind = 'FONDS' and o.fund->>'key' like 'fcp-bgfi%';

-- APRÈS. Le contrôle « Fonds connus sous deux clefs » de la page Santé passe
-- au vert de lui-même, sans rien relancer.

-- VARIANTE RÉVERSIBLE, si l'on préfère ne rien détruire : le client cesse de
-- voir le fantôme, la ligne reste en base, et le contrôle de Santé reste
-- rouge tant que la VL orpheline subsiste.
--   update offers set status = 'withdrawn' where id = 'fund-fcp-bgfi-bank-atlas';
