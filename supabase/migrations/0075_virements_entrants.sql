-- LES VIREMENTS BANCAIRES ENTRANTS, ET POURQUOI ILS ONT LEUR TABLE.
--
-- La banque a répondu non le 9 octobre 2026 : il n'y aura pas de numéro de
-- compte par client. Tous les virements arrivent donc sur un seul compte de
-- règlement, et la seule chose qui rattache un crédit à quelqu'un est le motif
-- que le client a recopié à la main dans le formulaire de sa banque.
--
-- UN CRÉDIT EST UN FAIT, UN RATTACHEMENT EST UNE DÉCISION, et c'est toute la
-- raison de cette table. Le journal des espèces d'un client ne peut pas porter
-- l'argent arrivé sans nom : il n'a pas de client à qui l'inscrire. Sans cette
-- table, ce crédit n'existerait donc nulle part, ni dans une file ni dans un
-- total, et personne ne saurait qu'il attend un nom pendant qu'un client
-- regarde une page vide.
--
-- `fingerprint` EST LA PIÈCE MAÎTRESSE, et elle est unique.
-- Un relevé se colle à la main, et il se recolle : la même ligne revient quand
-- la période se chevauche d'un mois à l'autre. Un double crédit ressemble à
-- deux virements, gonfle ce que la maison doit, et personne ne le voit passer ;
-- c'est exactement la famille des pannes muettes. L'empreinte est dérivée du
-- jour, du montant, du donneur d'ordre et du motif (voir domain/virement.ts),
-- donc la base refuse d'elle-même la seconde lecture.
-- Deux virements réellement identiques le même jour existent : l'empreinte
-- porte alors un suffixe d'occurrence, posé par un opérateur qui le confirme.
--
-- `motif` SE GARDE TEL QUEL, sans normalisation : c'est la pièce. Une
-- contestation porte sur ce que le relevé imprime, pas sur ce que notre
-- lecteur en a fait.
--
-- `user_id` est nullable, et ne se remplit qu'au rattachement : avant lui, la
-- maison ne sait pas à qui cet argent appartient, et une colonne remplie par
-- défaut serait un mensonge.
create table if not exists incoming_transfers (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  at date not null,
  amount numeric not null check (amount > 0),
  payer text not null,
  motif text,
  bank_ref text,
  state text not null default 'recu' check (state in ('recu', 'rattache', 'restitue')),
  user_id uuid,
  cash_entry uuid,
  note text,
  read_by text,
  closed_at timestamptz,
  closed_by text,
  closed_reason text,
  created_at timestamptz not null default now(),
  -- Un rattachement nomme son client ; une restitution dit pourquoi l'argent
  -- de quelqu'un repart. Ni l'un ni l'autre ne se suppose.
  constraint incoming_transfers_rattache_a_un_client check (state <> 'rattache' or user_id is not null),
  constraint incoming_transfers_restitue_dit_pourquoi check (state <> 'restitue' or closed_reason is not null)
);

-- La file du desk se range par ancienneté : c'est l'âge d'un crédit sans nom
-- qui appelle quelqu'un, pas son montant.
create index if not exists incoming_transfers_attente on incoming_transfers (at) where state = 'recu';
create index if not exists incoming_transfers_client on incoming_transfers (user_id, at desc) where user_id is not null;

comment on table incoming_transfers is
  'Les crédits reçus sur le compte de règlement, lus au relevé. Un crédit est un fait, un rattachement est une décision : la ligne existe même sans nom. fingerprint est unique, sans quoi un relevé relu deux fois créerait un double crédit que personne ne verrait.';
