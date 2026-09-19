-- Proven channels, the codes that prove them, the devices a client trusts for a fast return.
-- An intention leaves only with both channels proven; the desk sees the marks on each intent.

alter table profiles add column if not exists phone_verified_at timestamptz;
alter table profiles add column if not exists email_verified_at timestamptz;

alter table intents add column if not exists phone_verified boolean;
alter table intents add column if not exists email_verified boolean;

-- A six-digit code on a channel: hashed, ten minutes, five tries. A guest has no user yet.
create table if not exists channel_codes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  channel     text not null check (channel in ('whatsapp','sms','email')),
  target      text not null,
  code_hash   text not null,
  expires_at  timestamptz not null,
  attempts    smallint not null default 0,
  verified_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists channel_codes_target on channel_codes (channel, target, created_at desc);
alter table channel_codes enable row level security;
-- Only the server (service role) reads or writes codes.

-- A device the client trusts: a passkey (public key, counter) or a four-digit code (the hash of the secret it unlocks).
create table if not exists trusted_devices (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          text not null check (kind in ('passkey','pin')),
  name          text not null,
  credential_id text unique,
  public_key    text,
  counter       bigint,
  secret_hash   text,
  failures      smallint not null default 0,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);
create index if not exists trusted_devices_user on trusted_devices (user_id);
alter table trusted_devices enable row level security;
create policy "appareils : lire les siens" on trusted_devices for select using (user_id = auth.uid() or is_desk());
-- Writes go through the server (service role) : enrolment and use are checked there.
