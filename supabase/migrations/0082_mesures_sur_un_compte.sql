-- UNE MESURE SUR UN COMPTE : CE QUE LA MAISON DÉCIDE CONTRE UN CLIENT.
--
-- Deux crans seulement, « prepaiement » et « suspendu ». Le troisième
-- envisagé, « fermeture seule », attend qu'un client ait des titres à sortir.
--
-- La mesure courante vit sur le profil ; son histoire vit dans la chaîne
-- d'audit, qui est faite pour cela. Un champ par fait, et jamais une phrase
-- libre : le motif est pris dans une liste fermée, parce qu'une cause qui se
-- réécrit n'est plus contestable.
--
-- « jusqu_au » est le terme : au-delà, la mesure ne s'applique plus sans que
-- personne n'ait à la lever. Sinon un compte reste puni par oubli.
alter table profiles add column if not exists mesure text not null default 'aucune';
alter table profiles add column if not exists mesure_motif text;
alter table profiles add column if not exists mesure_par text;
alter table profiles add column if not exists mesure_le timestamptz;
alter table profiles add column if not exists mesure_jusqu_au date;

comment on column profiles.mesure is
  'aucune | prepaiement | suspendu. Ne retient jamais les espèces ni les titres du client, et ne coupe jamais son chemin vers le desk.';

create index if not exists profiles_sous_mesure on profiles (mesure) where mesure <> 'aucune';
