-- Guichet · le conseiller rattaché à un client
--
-- Un conseiller est un profil de l'équipe : on ne crée donc pas de table, le
-- client pointe vers un autre profil. « on delete set null » parce qu'un
-- départ libère ses clients au lieu de les laisser désigner quelqu'un qui
-- n'est plus là.
--
-- Le rattachement reste FACULTATIF : sans lui le client joint le desk, qui
-- répond. C'est la règle de la maison, pas un cas dégradé.

alter table profiles add column if not exists advisor_id uuid references profiles(id) on delete set null;

create index if not exists profiles_advisor on profiles (advisor_id) where advisor_id is not null;

comment on column profiles.advisor_id is 'Le membre de l''équipe qui suit ce client. Nul : le desk répond.';
