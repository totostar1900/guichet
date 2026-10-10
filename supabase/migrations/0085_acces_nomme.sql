-- L'ACCÈS NOMMÉ : QUI AGIT SUR UN COMPTE QUI N'EST PAS UNE PERSONNE PHYSIQUE.
--
-- Un compte porte un identifiant, donc une connexion. Pour une société, une
-- association ou une indivision, cette connexion unique était partagée entre
-- deux ou trois personnes : le journal ne pouvait jamais dire laquelle avait
-- agi, et la règle de décision du PV ne pouvait pas exister derrière un seul
-- jeu d'identifiants. C'est le socle, et rien d'autre ne tient sans lui.
--
-- LE COMPTE NE BOUGE PAS. Positions, espèces, ordres et documents restent
-- rangés sous l'identifiant du compte. Cette table dit seulement QUI est
-- autorisé à s'y connecter, et la session porte les deux : le compte sur
-- lequel on agit, et la personne qui agit.
--
-- L'ACCÈS SE DONNE À UN CANAL, PAS À UN IDENTIFIANT. Le desk n'a pas à créer
-- de compte pour personne : il désigne une personne déclarée au dossier et le
-- numéro ou l'adresse où elle se connectera. Le premier qui reçoit le code à
-- ce canal est la personne : la preuve est le code lui-même, comme pour tout
-- le reste de la maison. L'identifiant se lie à ce moment-là, une fois.
create table if not exists acces_compte (
  id uuid primary key default gen_random_uuid(),
  -- Le compte sur lequel la personne agit.
  compte_user_id uuid not null references auth.users (id) on delete cascade,
  -- Le nom tel que le dossier le déclare, et le rôle qui lui donne le droit d'agir.
  nom text not null,
  role text not null check (role in ('representant', 'cotitulaire')),
  -- Le canal où le code part : « phone » ou « email », valeur normalisée.
  canal text not null check (canal in ('phone', 'email')),
  canal_valeur text not null,
  -- Lié à la première connexion, et plus jamais après.
  personne_user_id uuid references auth.users (id) on delete set null,
  premiere_connexion_le timestamptz,
  accorde_par text not null,
  accorde_le timestamptz not null default now(),
  revoque_le timestamptz,
  revoque_par text,
  revoque_motif text
);

comment on table acces_compte is
  'Qui peut se connecter sur le compte d''une personne morale, d''une association ou d''une indivision. Le compte garde son identifiant ; la session porte en plus la personne qui agit.';

-- UN CANAL NE SERT QU'UN ACCÈS VIVANT : sinon deux comptes enverraient leur
-- code au même numéro et la personne ne saurait pas sur lequel elle entre.
create unique index if not exists acces_compte_canal_vivant on acces_compte (canal_valeur) where revoque_le is null;

-- UNE PERSONNE N'AGIT QUE SUR UN COMPTE À LA FOIS, et c'est une décision.
-- Un représentant peut légitimement servir deux sociétés ; le laisser faire
-- demanderait un sélecteur de compte, et l'ambiguïté sur « sur quel compte
-- suis-je en train de passer cet ordre » est la chose la plus dangereuse
-- qu'un écran de marché puisse porter. Le refus se dit au desk, en nommant
-- l'autre compte.
create unique index if not exists acces_compte_personne_vivante on acces_compte (personne_user_id) where revoque_le is null and personne_user_id is not null;

create index if not exists acces_compte_par_compte on acces_compte (compte_user_id) where revoque_le is null;

alter table acces_compte enable row level security;

-- La personne lit l'accès qui la concerne : son espace lui dit sur quel
-- compte elle agit, et à quel titre. Elle n'écrit rien.
drop policy if exists "personne lit son acces" on acces_compte;
create policy "personne lit son acces" on acces_compte
  for select using (auth.uid() = personne_user_id or auth.uid() = compte_user_id);
