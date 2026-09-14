-- Guichet · diffusion (WhatsApp, e-mail) et coordonnées de contact

alter table profiles add column if not exists email text;
-- Keep the e-mail on the profile in sync with auth.users at creation.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name, phone, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email,''), '@', 1)), new.phone, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

create type notify_channel as enum ('whatsapp','email');
create type notify_status as enum ('queued','sent','failed','skipped');
create type notify_kind as enum ('offer_published','intent_received','intent_update','document','results');

create table notifications (
  id            uuid primary key default gen_random_uuid(),
  kind          notify_kind not null,
  channel       notify_channel not null,
  to_address    text not null,
  contact_name  text,
  subject       text,
  body          text not null,
  document_id   uuid references documents(id) on delete set null,
  intent_id     uuid references intents(id) on delete set null,
  offer_id      text references offers(id) on delete set null,
  status        notify_status not null default 'queued',
  provider_id   text,
  error         text,
  created_at    timestamptz not null default now(),
  sent_at       timestamptz
);
create index notifications_created on notifications (created_at desc);
alter table notifications enable row level security;
create policy "notifications : desk" on notifications for all using (is_desk()) with check (is_desk());

-- Inbound WhatsApp (webhook) — kept for the audit trail and the 24 h service window.
create table inbound_messages (
  id            uuid primary key default gen_random_uuid(),
  channel       notify_channel not null default 'whatsapp',
  from_address  text not null,
  body          text,
  payload       jsonb,
  received_at   timestamptz not null default now()
);
alter table inbound_messages enable row level security;
create policy "inbound : desk" on inbound_messages for all using (is_desk()) with check (is_desk());
