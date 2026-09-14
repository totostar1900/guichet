-- Guichet · OPCVM (souscription / rachat de parts de fonds lus dans le bulletin)
alter type offer_kind add value if not exists 'FONDS';
alter type offer_operation add value if not exists 'opcvm';
alter type intent_type add value if not exists 'souscription';
alter type intent_type add value if not exists 'rachat';
-- Terms of the fund as distributed (NAV from the bulletin + our agreement with the manager).
alter table offers add column if not exists fund jsonb;
