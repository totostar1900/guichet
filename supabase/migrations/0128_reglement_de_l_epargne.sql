-- LE MODE DE RÈGLEMENT D'UNE ÉPARGNE PROGRAMMÉE (11 novembre 2026, audit « signature du mandat d'une épargne »).
--
-- L'ordre permanent ne retenait pas ce que le client avait choisi à la création : « je vire moi-même » ou « prélevez-moi ».
-- Seul le mandat, quand il existait, le disait ; juste après la création, avant la préparation du mandat, la ligne affichait donc « payée par virement » à un client qui avait choisi le prélèvement.
-- « reglement » le garde : « virement » est ce qui existait (le client vire sur appel de fonds), « prelevement » dit qu'un mandat doit couvrir l'épargne.
alter table standing_orders add column if not exists reglement text not null default 'virement'
  check (reglement in ('virement', 'prelevement'));

comment on column standing_orders.reglement is
  'Comment l''épargne est payée, choisi à la création : un virement du client sur appel de fonds, ou un prélèvement sous mandat signé.';
