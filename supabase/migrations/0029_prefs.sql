-- The client's personal preferences (how the desk may reach them, statements by e-mail), set from the account sheet.
alter table profiles add column if not exists prefs jsonb;
