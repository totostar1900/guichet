-- État « en revue » de la file d'entrée : un opérateur demande la relecture d'un brouillon
-- avant publication. À exécuter seul (ajout d'une valeur d'enum).
alter type intake_state add value if not exists 'en_revue';
