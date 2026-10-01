-- Guichet · la lecture d'une pièce d'intake se marque elle-même
--
-- POURQUOI UN MARQUEUR ET NON UNE DÉDUCTION. La même erreur a déjà été faite
-- une fois, sur les résultats d'adjudication : l'état d'une lecture se déduisait
-- de « updated_at > created_at », et comme le robot d'ingestion réécrit chaque
-- ligne à chaque passe, 127 communiqués jamais ouverts se sont déclarés déjà
-- tentés et la file s'est dite vide. La migration 0047 a corrigé cela par un
-- marqueur explicite. Celle-ci fait pareil pour les pièces d'intake.
--
-- La lecture se marque QU'ELLE AIT RENDU QUELQUE CHOSE OU NON : sans cela, une
-- pièce illisible serait retentée sans fin, et chaque passe paierait son appel.
--
-- Le modèle employé est gardé à côté : comparer deux lectures ne veut rien dire
-- sans savoir qui a lu.

alter table intake_items add column if not exists read_at timestamptz;
alter table intake_items add column if not exists read_model text;

-- La file d'attente : ce qui n'a jamais été tenté, le plus ancien d'abord.
create index if not exists intake_a_lire on intake_items (received_at) where read_at is null;

comment on column intake_items.read_at is 'Quand la lecture automatique a été tentée, qu''elle ait rendu quelque chose ou non. Nul : jamais tentée.';
comment on column intake_items.read_model is 'Le modèle qui a lu : comparer deux lectures ne veut rien dire sans lui.';
