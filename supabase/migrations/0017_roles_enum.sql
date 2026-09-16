-- Rôle « responsable » : desk + gestion de l'équipe et approbations.
-- Postgres exige que l'ajout d'une valeur d'enum soit exécuté seul (hors transaction
-- qui l'utilise) : lancer ce fichier, puis 0018_roles.sql.
alter type user_role add value if not exists 'responsable';
