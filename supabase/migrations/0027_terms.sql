-- What the client accepted, and when: the version (its date) of the legal text.
alter table profiles add column if not exists terms_version text;
alter table profiles add column if not exists terms_accepted_at timestamptz;
