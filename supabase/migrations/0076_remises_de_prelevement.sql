-- L'EXÉCUTION DES MANDATS : la remise, et le sort de chaque tirage.
--
-- Le mandat (0074) est l'autorisation ; ces deux tables sont ce qu'on en fait.
-- Elles existent parce qu'un prélèvement n'est pas un virement de plus : un
-- virement qui n'arrive pas est un non-événement, un prélèvement qui échoue
-- est un REJET, il coûte au client, il s'inscrit chez sa banque, et répété il
-- fait casser le mandat.
--
-- `debit_batches` EST LA REMISE, c'est-à-dire le fichier tel qu'il a été
-- déposé. Elle a sa propre référence parce que c'est elle que la banque cite
-- quand elle répond, et parce qu'un fichier régénéré plus tard à partir des
-- lignes d'aujourd'hui ne serait plus celui qui a été remis.
--
-- `debit_draws` EST LE TIRAGE, une ligne par client et par échéance.
--   `notice_sent` porte la règle qui compte : rien ne part sans que son
--   préavis soit parti. C'est déjà la loi des instructions permanentes, et
--   elle vaut davantage ici, où l'absence d'annonce se découvre sur un relevé
--   bancaire.
--   `reject_code` porte la seconde : la CAUSE d'un rejet décide de la suite,
--   pas le nombre. Une provision insuffisante se représente une fois ; un
--   compte clos ne se représente jamais.
--   `retry_of` relie une seconde présentation à la première, sans quoi deux
--   lignes identiques à quinze jours d'écart seraient indiscernables d'un
--   double prélèvement.
--
-- CE QUI N'EST PAS UNE COLONNE : « sans nouvelle ». Un tirage remis dont on
-- n'a ni encaissement ni rejet est sans nouvelle À PARTIR d'un certain jour,
-- donc l'état dépend du moment où on regarde. Rangé, il serait faux le
-- lendemain. Il se calcule (voir domain/prelevement.ts).
create table if not exists debit_batches (
  id uuid primary key default gen_random_uuid(),
  ref text not null,
  due_on date not null,
  state text not null default 'preparee' check (state in ('preparee', 'remise')),
  created_at timestamptz not null default now(),
  created_by text,
  handed_at timestamptz,
  handed_by text,
  -- Une seule remise par échéance : deux fichiers pour le même jour, c'est un
  -- double prélèvement chez chaque client de la liste.
  constraint debit_batches_une_par_echeance unique (due_on)
);

create table if not exists debit_draws (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  batch_id uuid references debit_batches (id),
  mandate_id uuid not null references direct_debit_mandates (id),
  user_id uuid not null,
  due_on date not null,
  amount numeric not null check (amount > 0),
  state text not null default 'prepare' check (state in ('prepare', 'remis', 'encaisse', 'rejete', 'abandonne')),
  announced_at timestamptz,
  notice_sent boolean not null default false,
  notice_error text,
  handed_at timestamptz,
  settled_at timestamptz,
  reject_code text check (reject_code in ('provision_insuffisante', 'compte_clos', 'opposition', 'coordonnees_erronees', 'mandat_inconnu', 'autre')),
  reject_note text,
  cash_entry uuid,
  retry_of uuid references debit_draws (id),
  created_at timestamptz not null default now(),
  -- Un mandat ne se présente qu'une fois par échéance. La seconde présentation
  -- d'un rejet porte une autre date, donc elle passe.
  constraint debit_draws_une_par_mandat_et_echeance unique (mandate_id, due_on),
  -- Un rejet dit toujours pourquoi : « rejeté » sans cause ne décide de rien,
  -- puisque c'est la cause qui décide de la suite.
  constraint debit_draws_rejet_dit_pourquoi check (state <> 'rejete' or reject_code is not null)
);

create index if not exists debit_draws_echeance on debit_draws (due_on, state);
create index if not exists debit_draws_en_attente on debit_draws (handed_at) where state = 'remis';
create index if not exists debit_draws_client on debit_draws (user_id, due_on desc);

comment on table debit_batches is
  'Les remises de prélèvement : le fichier tel qu''il a été déposé à la banque. Une seule par échéance, sans quoi deux fichiers du même jour feraient un double prélèvement chez chaque client.';
comment on table debit_draws is
  'Les tirages, une ligne par client et par échéance. notice_sent interdit la remise sans préavis parti ; reject_code porte la cause, qui décide de la suite. « Sans nouvelle » ne s''y range pas : il se calcule.';
