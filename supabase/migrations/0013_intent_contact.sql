-- Where the client asked to be reached for a given intent (phone for WhatsApp/call, e-mail).
alter table intents add column if not exists contact_phone text;
alter table intents add column if not exists contact_email text;
