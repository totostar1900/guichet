-- The client's financial profile (seven answers, a kind, four measures), and the flag an intention carries when it leaves that profile.
alter table profiles add column if not exists financial_profile jsonb;
alter table intents add column if not exists profile_flag text;
