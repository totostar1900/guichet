-- LES DATES DES PASSAGES D'UN ORDRE (15 novembre 2026).
--
-- Un ordre ne portait que quatre dates : la demande, la signature, la couverture, et « updated_at », qui bouge à chaque modification et ne
-- dit donc rien du métier. Les passages du desk (confirmation, transmission, exécution, règlement, clôture) n'avaient aucune date sur l'ordre :
-- il fallait les lire dans le journal d'audit ou dans un texte. Elles sont posées UNE FOIS, au premier passage, par le dépôt : jamais réécrites.
--
--   confirmed_at    confirmée par le desk
--   transmitted_at  transmise au marché
--   served_at       exécutée (servie)
--   settled_at      réglée : le jour où le desk a cliqué « Réglé »
--   closed_at       close : non servie ou annulée
--   value_on        le règlement-livraison (jour de valeur) quand il est connu ; il peut différer du clic
alter table intents
  add column if not exists confirmed_at   timestamptz,
  add column if not exists transmitted_at timestamptz,
  add column if not exists served_at      timestamptz,
  add column if not exists settled_at     timestamptz,
  add column if not exists closed_at      timestamptz,
  add column if not exists value_on       date;

-- RATTRAPAGE depuis le journal d'audit, pour les ordres déjà passés : la date du premier passage dans l'état, quand le journal l'a vu.
-- Ce que le journal n'a pas vu reste vide : on n'invente pas une date. Le déclencheur d'« updated_at » est suspendu, le rattrapage n'est pas une modification.
alter table intents disable trigger intents_touch;
update intents i set confirmed_at   = a.at from (select entity_id, min(at) as at from audit where entity = 'intent' and after->>'state' = 'confirmee'   group by entity_id) a where a.entity_id = i.id::text and i.confirmed_at   is null;
update intents i set transmitted_at = a.at from (select entity_id, min(at) as at from audit where entity = 'intent' and after->>'state' = 'transmise'   group by entity_id) a where a.entity_id = i.id::text and i.transmitted_at is null;
update intents i set served_at      = a.at from (select entity_id, min(at) as at from audit where entity = 'intent' and after->>'state' = 'servie'      group by entity_id) a where a.entity_id = i.id::text and i.served_at      is null;
update intents i set settled_at     = a.at from (select entity_id, min(at) as at from audit where entity = 'intent' and after->>'state' = 'reglee'      group by entity_id) a where a.entity_id = i.id::text and i.settled_at     is null;
update intents i set closed_at      = a.at from (select entity_id, min(at) as at from audit where entity = 'intent' and after->>'state' in ('annulee', 'non_servie') group by entity_id) a where a.entity_id = i.id::text and i.closed_at is null;
alter table intents enable trigger intents_touch;
