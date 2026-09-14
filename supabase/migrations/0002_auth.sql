-- Guichet · authentification et profils
-- Un profil par utilisateur Supabase Auth ; rôle client ou desk.

create type user_role as enum ('client','desk');

create table profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  role              user_role not null default 'client',
  display_name      text,
  segment           text,                         -- "Personne physique · Douala"
  tier              smallint not null default 1,  -- 0 visiteur, 1 identifié, 2 compte-titres ouvert
  phone             text,
  whatsapp_opt_in   boolean not null default false,
  whatsapp_opt_in_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger profiles_touch before update on profiles for each row execute function touch_updated_at();

-- Création automatique du profil à l'inscription (e-mail OTP, lien magique, téléphone).
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email,''), '@', 1)), new.phone)
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Helper : l'utilisateur courant est-il du desk ?
create or replace function is_desk() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'desk')
$$;

-- Les intentions référencent désormais le profil.
alter table intents
  add constraint intents_client_fk foreign key (client_id) references profiles(id) on delete set null;

-- ---------- RLS ----------
alter table profiles enable row level security;

create policy "profil : lecture de soi" on profiles for select using (id = auth.uid() or is_desk());
create policy "profil : mise à jour de soi (hors rôle)" on profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

-- Intentions : un client crée et lit les siennes ; le desk voit et modifie tout.
create policy "intentions : créer les siennes" on intents for insert
  with check (client_id = auth.uid());
create policy "intentions : lire les siennes" on intents for select
  using (client_id = auth.uid() or is_desk());
create policy "intentions : desk met à jour" on intents for update
  using (is_desk()) with check (is_desk());

-- Journal : lecture desk ; les événements liés à ses intentions pour le client.
create policy "événements : desk" on events for select using (is_desk());
create policy "événements : client sur ses intentions" on events for select
  using (intent_id in (select id from intents where client_id = auth.uid()));

-- Offres : le desk peut créer, modifier, publier.
create policy "offres : desk écrit" on offers for all using (is_desk()) with check (is_desk());
create policy "versions : desk" on offer_versions for all using (is_desk()) with check (is_desk());
create policy "versions : lecture publique" on offer_versions for select using (true);

-- Promouvoir un membre du desk (à exécuter une fois par personne) :
--   update profiles set role = 'desk' where id = (select id from auth.users where email = 'prenom@purposecapital.africa');
-- ou lister les adresses dans DESK_EMAILS (variable d'environnement) pour l'amorçage.
