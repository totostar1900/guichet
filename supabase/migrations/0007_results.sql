-- Guichet · résultats d'adjudication et positions
alter table intents add column if not exists allocation_pct numeric(6,2);
alter table intents add column if not exists served_units numeric(18,2);
-- Coupon notices are idempotent through notifications.subject = 'coupon:<intent>:<date>'.
create index if not exists notifications_subject on notifications (subject);
