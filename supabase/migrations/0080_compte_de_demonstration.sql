-- UN COMPTE DE DÉMONSTRATION EST UN FAIT, PAS UNE CONVENTION DE NOM.
--
-- Trois comptes d'essai vivent en production depuis septembre 2026, et la
-- maison a décidé le 10 octobre 2026 de les garder pour montrer le service.
-- Gardés sans marque, ils comptaient comme des clients réels : leurs dossiers
-- entraient au registre des clients du reporting, et leurs trois intentions au
-- journal des ordres, c'est-à-dire dans les deux pièces qui se montrent au
-- régulateur. Le drapeau vit sur le compte, parce que tout ce qui en découle
-- (dossier, ordres, positions, messages) est de la démonstration par son
-- propriétaire, et jamais l'inverse.
alter table profiles add column if not exists demo boolean not null default false;

comment on column profiles.demo is
  'Compte de démonstration : écarté du reporting réglementaire, marqué sur le desk. Jamais un client réel.';

-- Les trois comptes d'essai de la maison, marqués une fois.
update profiles set demo = true
where id in (
  '1b633f5d-0221-4c4f-a77f-2fc9bf358207',
  'bba359cf-ed73-4a9f-be4c-c6b6d44eb026',
  'def35259-f0f3-485f-bb49-d7a3d1d0ba2c'
);
