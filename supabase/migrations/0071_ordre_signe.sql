-- UN ORDRE SE SIGNE QUAND ON LE PASSE, ET NON TROIS JOURS APRÈS.
--
-- Le parcours tenait en quatre gestes et deux attentes : le client annonçait
-- une intention, attendait que le desk confirme et fabrique le bulletin, le
-- signait hors de l'application, puis attendait encore la transmission. La
-- signature était hors bande : le desk cochait « signé » dans l'écran des
-- documents, une fois le papier revenu.
--
-- Or le desk n'ajoutait aucune arithmétique entre l'intention et le bulletin :
-- src/lib/documents/position.ts calcule déjà le principal, la commission et le
-- total. Il ajoutait une DÉCISION. Une décision ne demande pas deux allers.
--
-- L'ordre porte donc sa propre signature, par le code à usage unique qui sert
-- déjà à la convention : même mécanisme, même preuve, même vocabulaire. Le
-- client signe au moment où il passe l'ordre, et il ne reste au desk qu'un
-- seul geste.
--
-- Les quatre colonnes « pending_code_* » portent le code en cours, comme les
-- consentements du dossier client le font pour la convention. Elles sont
-- vidées à la signature : un code consommé ne se rejoue pas.
alter table intents
  add column if not exists pending_code_hash  text,
  add column if not exists pending_code_at    timestamptz,
  add column if not exists pending_code_tries integer not null default 0,
  add column if not exists pending_code_to    text,
  -- La signature elle-même, et ce qui la prouve : quand, comment, où le code est parti.
  add column if not exists signed_at          timestamptz,
  add column if not exists signed_method      text,
  add column if not exists signed_to          text,
  -- Le document d'ordre produit à la signature : un seul, au lieu du bulletin
  -- puis de l'appel de fonds émis par le desk.
  add column if not exists order_doc_id       uuid references documents(id);

-- Le carnet du desk trie les ordres signés en tête : ils n'attendent plus que lui.
create index if not exists intents_signes on intents (signed_at desc nulls last);
