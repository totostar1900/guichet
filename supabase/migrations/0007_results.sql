-- Guichet · résultats d'adjudication et positions
alter table intents add column if not exists allocation_pct numeric(6,2);
alter table intents add column if not exists served_units numeric(18,2);
-- Coupon notices are idempotent through notifications.subject = 'coupon:<intent>:<date>'.
create index if not exists notifications_subject on notifications (subject);
alter type document_type add value if not exists 'releve';
alter type document_type add value if not exists 'attestation';
alter table documents add column if not exists client_id uuid references profiles(id) on delete set null;
create policy "documents : client lit ses relevés" on documents for select using (client_id = auth.uid());
