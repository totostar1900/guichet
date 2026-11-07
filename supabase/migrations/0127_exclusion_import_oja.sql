-- L'exclusion d'un import OJA se motive et se signe : qui l'a exclu, quand, et pourquoi (le desk écrit un commentaire au moment de l'exclusion).
alter table public.oja_imports
  add column if not exists exclu_motif text,
  add column if not exists exclu_par text,
  add column if not exists exclu_le timestamptz;
