-- LE REGISTRE DES GESTES D'UN CLIENT.
--
-- Sur les quarante et un gestes qu'un client peut faire dans le Guichet, huit
-- laissaient une trace au 10 octobre 2026, et seulement parce qu'ils
-- touchaient à une décision du desk. Les autres ne s'écrivaient nulle part.
--
-- Pourquoi une table et non la chaîne d'audit : l'audit relit son dernier
-- maillon avant chaque écriture pour enchaîner les condensés. C'est juste pour
-- une décision du desk, et intenable pour des milliers de gestes de clients.
-- Mêmes colonnes, sans la chaîne.
create table if not exists client_actions (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  user_id uuid not null references profiles (id) on delete cascade,
  geste text not null,
  genre text not null,
  objet text,
  detail text,
  canal text,
  ip text,
  user_agent text,
  -- Une consultation ne se garde qu'une fois par jour et par objet : sans
  -- cela, dix ouvertures d'une même fiche écriraient dix lignes, le fil
  -- deviendrait illisible et le registre grossirait de ce qui n'apprend rien.
  clef_du_jour text
);

comment on table client_actions is
  'Les gestes des clients. Registre non chaîné, distinct de « audit » qui garde les décisions du desk.';

create unique index if not exists client_actions_clef_du_jour on client_actions (clef_du_jour) where clef_du_jour is not null;
create index if not exists client_actions_user_at on client_actions (user_id, at desc);
create index if not exists client_actions_at on client_actions (at desc);
create index if not exists client_actions_genre on client_actions (genre, at desc);

alter table client_actions enable row level security;

-- Un client lit ses propres gestes, et rien d'autre : c'est ce qui permet de
-- lui montrer son activité, et c'est aussi ce qui lui fait repérer une
-- intrusion avant nous. L'écriture passe par le serveur, jamais par le client.
drop policy if exists "client lit ses gestes" on client_actions;
create policy "client lit ses gestes" on client_actions for select using (auth.uid() = user_id);
