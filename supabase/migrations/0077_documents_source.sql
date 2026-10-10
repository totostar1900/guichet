-- LA PIÈCE DONT UN DOCUMENT EST L'AVIS.
--
-- Les trois avis d'argent (versement, prélèvement, droits de garde) naissent
-- d'une ligne d'une autre table : une demande de versement, un tirage, un
-- avis de garde. Sans ce lien, la page des documents du client ne saurait pas
-- quel papier existe déjà pour un mouvement, et le même mouvement y
-- paraîtrait deux fois : une ligne lue de la table, une ligne lue du document.
--
-- Le lien reste volontairement sans clef étrangère : il pointe vers trois
-- tables différentes selon le type du document, et une contrainte qui ne
-- vaudrait que pour l'une des trois ne protégerait rien.
alter table public.documents add column if not exists source_id text;

create index if not exists documents_source_idx on public.documents (source_id) where source_id is not null;
