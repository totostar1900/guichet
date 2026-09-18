-- The desk inbox: inbound WhatsApp and e-mail kept as messages, with a handled mark.
alter table inbound_messages add column if not exists contact_name text;
alter table inbound_messages add column if not exists subject text;
alter table inbound_messages add column if not exists handled_at timestamptz;
alter table inbound_messages add column if not exists handled_by text;
create index if not exists inbound_received on inbound_messages (received_at desc);
