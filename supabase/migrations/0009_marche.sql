-- Guichet · marché secondaire (cotations, ordres d'achat / vente)
alter type offer_kind add value if not exists 'MARCHE';
alter type offer_operation add value if not exists 'secondaire';
alter type intent_type add value if not exists 'achat';
alter type intent_type add value if not exists 'vente';
alter table offers add column if not exists market text;
alter table offers add column if not exists instrument text;
alter table offers add column if not exists bid numeric(18,3);
alter table offers add column if not exists ask numeric(18,3);
alter table offers add column if not exists lot_size integer;
alter table offers add column if not exists settlement_days integer;
alter table intents add column if not exists limit_price numeric(18,3);
alter table intents add column if not exists executed_price numeric(18,3);
