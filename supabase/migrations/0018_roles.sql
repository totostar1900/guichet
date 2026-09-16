-- Rôles du desk : opérateur (desk) et responsable ; MFA obligatoire pour les deux.
alter table profiles add column if not exists mfa_enrolled_at timestamptz;
alter table profiles add column if not exists role_set_by text;
alter table profiles add column if not exists role_set_at timestamptz;

-- is_desk() couvre les deux niveaux ; is_responsable() le second seulement.
create or replace function is_desk() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('desk','responsable'))
$$;
create or replace function is_responsable() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'responsable')
$$;
