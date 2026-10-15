-- UN ROBOT NE DECLARE DISPARU QUE CE QU IL SURVEILLE.
--
-- Defaut mesure le 15 octobre 2026. Le journal de la BEAC a ete elargi aux
-- quatre pages de statistiques sans que le robot, qui ne lit que la page des
-- annonces, en sache rien. A son passage suivant il a trouve 345 pieces
-- « manquantes » de SA page et les a toutes declarees disparues, titre vide.
-- Elles n avaient jamais quitte le site, et l audit a crie sur 425 fichiers
-- bien presents.
--
-- C est la meme precaution que le booleen « lecture reussie », poussee d un
-- cran : « je n ai pas lu la page » et « cette piece n est pas de ma page »
-- produisent la meme fausse annulation.
alter table public.beac_observations add column if not exists page text;

update public.beac_observations
set page = case when genre in ('statistiques', 'bulletin', 'courbe', 'programme') then 'statistiques' else 'annonces' end
where page is null and titre is not null and titre <> '';

-- Les 345 fausses disparitions s effacent. Le journal est en ajout seul, et
-- il le reste : ces lignes ne racontent pas un fait, elles racontent un bogue.
delete from public.beac_observations o
where o.present = false
  and (o.titre is null or o.titre = '')
  and o.vu_le >= '2026-10-15'
  and exists (
    select 1 from public.beac_observations v
    where v.url = o.url and v.present = true
      and v.genre in ('statistiques', 'bulletin', 'courbe', 'programme')
  );

update public.beac_observations set page = 'annonces' where page is null;
