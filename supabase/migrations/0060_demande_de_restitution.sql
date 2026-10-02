-- La demande de restitution : le souhait du client, écrit quelque part.
--
-- La règle des espèces a changé le 2 octobre 2026. L'argent qui se trouve sur
-- les comptes de la maison appartient au client, et il peut y rester aussi
-- longtemps que le client le souhaite.
--
-- La seconde moitié de cette phrase est ce qui rend cette table nécessaire.
-- Jusqu'ici, un solde sans destination repartait de lui-même : la politique
-- était fermée, et le desk voyait « à renvoyer sur le compte du client ». Sans
-- délai, plus rien ne repart de soi-même, et si le souhait du client n'a pas
-- d'endroit où s'écrire, le seul chemin de sortie devient un message sur
-- WhatsApp que personne n'enregistre. Une instruction de sortie d'argent qui
-- vit dans une conversation est une instruction qu'on perd.
--
-- Ce que la ligne garde, et pourquoi chaque champ :
--
--   asked_amount  le solde disponible AU MOMENT DE LA DEMANDE. Il ne sert pas
--                 à payer, parce qu'il aura peut-être bougé : il sert à voir
--                 que ce que le client a demandé n'est pas ce qu'il a reçu.
--   paid_amount   ce qui a réellement été viré, et l'écriture du journal qui le
--                 porte. Le montant payé est recalculé au moment de payer.
--   cash_entry    le mouvement de restitution. La demande n'est pas le
--                 mouvement : l'un est un souhait, l'autre est de l'argent, et
--                 les confondre ferait croire qu'une demande vide un solde.
--
-- Une seule demande ouverte par client à la fois. Deux demandes vivantes sur un
-- même solde conduiraient à le payer deux fois, et l'index le rend impossible
-- plutôt que de compter sur l'écran.

create table if not exists cash_payouts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,
  asked_at      timestamptz not null default now(),
  asked_amount  numeric(18, 2) not null check (asked_amount > 0),
  note          text,
  state         text not null default 'demandee' check (state in ('demandee', 'payee', 'refusee')),
  closed_at     timestamptz,
  closed_by     text,
  -- Le motif est obligatoire sur un refus : un refus sans raison n'est pas une
  -- réponse, et c'est l'argent du client qu'on garde.
  closed_reason text,
  paid_amount   numeric(18, 2),
  cash_entry    uuid,
  constraint cash_payouts_refus_motive check (state <> 'refusee' or (closed_reason is not null and length(btrim(closed_reason)) >= 3)),
  constraint cash_payouts_paiement_chiffre check (state <> 'payee' or (paid_amount is not null and paid_amount > 0))
);

create unique index if not exists cash_payouts_une_ouverte on cash_payouts (user_id) where state = 'demandee';
create index if not exists cash_payouts_file on cash_payouts (state, asked_at);

comment on column cash_payouts.asked_amount is
  'Le disponible au moment de la demande. Il sert à voir l''écart avec ce qui a été payé, jamais à payer.';
comment on column cash_payouts.cash_entry is
  'Le mouvement de restitution au journal. Une demande est un souhait, un mouvement est de l''argent.';

alter table cash_payouts enable row level security;
-- atteinte par le rôle de service seulement : la demande du client passe par une
-- action serveur, le paiement par le desk.
