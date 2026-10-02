-- Guichet · la pièce vit avec le message qui l'apportait
--
-- POURQUOI ELLE NE VA PLUS DANS « À VALIDER ». Cette file sert à ce qui peut
-- devenir une LIGNE DE MARCHÉ : les communiqués ramassés par les crons, les avis
-- d'émission, les résultats d'adjudication. Un document qu'un régulateur ou un
-- client envoie n'a rien à y devenir, et le bouton « Publier » n'a aucun sens à
-- côté de lui.
--
-- Jusqu'ici un courriel écrivait DEUX choses sans lien : une ligne dans Messages
-- et une entrée dans À valider. Le desk faisait la jonction de tête.
--
-- Le tableau suit la forme que la maison emploie déjà pour `offers.documents` et
-- `client_files.documents` : une liste d'objets
-- { name, fileKey, mimeType, size, inline }.
--
-- La promotion vers « À valider » reste un geste de personne : aucune règle sur
-- l'expéditeur ne peut trancher, puisqu'un membre de l'équipe transfère aussi
-- bien un communiqué du Trésor qu'une lettre de la COSUMAF.

alter table inbound_messages add column if not exists attachments jsonb not null default '[]'::jsonb;

comment on column inbound_messages.attachments is 'Les pièces jointes gardées au dépôt : [{ name, fileKey, mimeType, size }]. Une personne peut en promouvoir une vers « À valider ».';
