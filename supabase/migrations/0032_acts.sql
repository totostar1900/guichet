-- Actes et avis : quatre documents nouveaux, la fin de la relation, les mandats.
-- Enum additions run alone (Postgres refuses to use a new enum value in the same transaction).
alter type document_type add value if not exists 'mandat';
alter type document_type add value if not exists 'coupon';
alter type document_type add value if not exists 'reclamation';
alter type document_type add value if not exists 'transfert';
alter type kyc_status add value if not exists 'en_cloture';
alter type kyc_status add value if not exists 'clos';
-- the flow a coupon / redemption notice covers, so it is issued once per client, line and date
alter table documents add column if not exists flow_key text;
create unique index if not exists documents_flow_key on documents (flow_key) where flow_key is not null;
-- mandates given and the closure in progress, on the client file
alter table client_files add column if not exists acts jsonb;
