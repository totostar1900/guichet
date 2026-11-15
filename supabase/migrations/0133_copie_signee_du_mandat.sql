-- LA COPIE SIGNÉE À LA MAIN D'UN MANDAT DE PRÉLÈVEMENT (15 novembre 2026, maquette « Signature manuelle » : 1A).
--
-- Un mandat créé depuis cette date se signe deux fois : par code (le consentement en ligne), puis à la main sur le même document, déposé à la banque du
-- client, dont une copie vient au desk. Le prélèvement attend la vérification de cette copie. Les mandats déjà en place ne sont pas concernés :
-- `copy_required` vaut faux pour eux, et l'application les lit comme avant.
--
--   copy_required     la copie est exigée (vrai pour tout mandat créé après cette migration)
--   copy_key          la clef du fichier dans le stockage des sources
--   copy_name         le nom du fichier envoyé
--   copy_type         son type (PDF, JPEG ou PNG)
--   copy_received_at  quand la dernière copie est arrivée
--   verified_at/_by   quand le desk l'a validée, et qui
--   refusal_reason    le dernier refus, un motif d'une liste fermée
--   refused_at        quand
--   reminded_at       le rappel envoyé quand la copie tarde : une seule fois

alter table direct_debit_mandates
  add column if not exists copy_required boolean not null default false,
  add column if not exists copy_key text,
  add column if not exists copy_name text,
  add column if not exists copy_type text,
  add column if not exists copy_received_at timestamptz,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by text,
  add column if not exists refusal_reason text,
  add column if not exists refused_at timestamptz,
  add column if not exists reminded_at timestamptz;
