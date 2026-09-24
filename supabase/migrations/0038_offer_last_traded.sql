-- Le BOC cote toutes les lignes à chaque séance ; elles ne se traitent pas toutes.
-- « Dernier cours du 9 sept. » se lisait comme « elle a traité le 9 septembre »
-- alors qu'une ligne peut n'avoir rien échangé depuis des mois. Cette colonne
-- porte la dernière séance où un prix s'est réellement formé ; elle se remplit
-- à l'ingestion du bulletin et ne bouge pas quand la séance n'a rien vu.
alter table offers add column if not exists last_traded_on date;
