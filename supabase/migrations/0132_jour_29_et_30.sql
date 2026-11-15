-- Le jour d'un versement mensuel va de 1 à 30 (décision du 15 novembre 2026).
--
-- Le 29 et le 30 n'existent pas en février : la règle est écrite dans le code (« dateDuVersement »), le versement tombe alors le 1er mars. La base ne
-- bornait le jour qu'à 28 « parce que tous les mois ont ces jours-là » ; elle laisse maintenant passer jusqu'à 30. Le 31 reste refusé.
-- Les mandats de provision gardent leur plage de 1 à 28 : leur jour est celui que le client signe, sans règle de février.

alter table standing_orders drop constraint if exists standing_orders_day_of_month_check;
alter table standing_orders add constraint standing_orders_day_of_month_check check (day_of_month between 1 and 30);
