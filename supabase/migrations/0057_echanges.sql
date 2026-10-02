-- Guichet · l'échange, entre le correspondant et le message
--
-- ─── Ce qui manquait ───────────────────────────────────────────────────────
--
-- La boîte aux lettres groupait par ADRESSE : tout ce qu'un correspondant a
-- jamais écrit tenait dans un fil unique. La BEAC envoie un avis par séance,
-- donc dix-sept affaires distinctes dans un seul fil sans fin, où rien ne peut
-- être dit réglé autrement que message par message.
--
-- Et l'étiquette, posée sur ce fil, portait sur une personne : « réclamation »
-- décrit un échange, pas un correspondant. Le même client écrit pour un ordre
-- en mars et pour une réclamation en juin.
--
-- ─── Les en-têtes étaient analysés puis jetés ──────────────────────────────
--
-- `lireRfc822` lit tous les en-têtes du message, et `createInbound` n'écrivait
-- que l'expéditeur, l'objet, le corps, la date et les pièces. `In-Reply-To` est
-- le seul chemin qui ne devine rien pour savoir à quel échange une réponse
-- appartient : il est gardé à partir d'ici.
--
-- ─── La clef est écrite à l'arrivée, pas recalculée ────────────────────────
--
-- Les étiquettes et les reports s'accrochent à `conv_key`. Recalculée à chaque
-- lecture, elle suivrait les changements de règle, et l'étiquette d'un échange
-- sauterait sur un autre sans que personne ne comprenne. Ce qu'un message a
-- reçu, il le garde. La règle vit une seule fois, dans
-- src/lib/domain/echange.ts, sous cliquet.
--
-- ─── Le passé est approximé, et il le dira ─────────────────────────────────
--
-- Les messages déjà reçus n'ont pas d'en-têtes gardés : le remplissage les
-- regroupe par objet seul, et l'historique WhatsApp par silences. Certains
-- échanges anciens seront mal coupés. Ce n'est pas rattrapable et c'est
-- tolérable : ce qui compte se traite dans les jours qui suivent son arrivée.
-- Deux échanges mal coupés se recollent à la main ; aucune règle ne les
-- recollera toute seule, parce qu'une telle règle referait l'erreur du
-- regroupement par expéditeur, en moins visible.

alter table inbound_messages add column if not exists message_id text;
alter table inbound_messages add column if not exists in_reply_to text;
alter table inbound_messages add column if not exists conv_key text;

-- Retrouver le parent d'une réponse, et rassembler un échange : les deux seules
-- lectures que la règle demande.
create index if not exists inbound_messages_message_id on inbound_messages (message_id) where message_id is not null;
create index if not exists inbound_messages_conv on inbound_messages (conv_key, received_at desc);

comment on column inbound_messages.message_id is
  'L''identifiant que le message se donne (en-tête Message-ID). Il sert de cible aux réponses.';
comment on column inbound_messages.in_reply_to is
  'Le message auquel celui-ci répond. C''est le seul chemin qui ne devine rien pour former un échange.';
comment on column inbound_messages.conv_key is
  'L''échange auquel ce message appartient, décidé À L''ARRIVÉE et jamais recalculé : les étiquettes et les reports s''y accrochent. La règle vit dans src/lib/domain/echange.ts.';

-- ─── L'état d'un échange ───────────────────────────────────────────────────
--
-- Reporté et étiqueté descendent ici, du correspondant vers l'affaire, parce
-- que c'est de l'affaire qu'ils sont vrais. L'épingle reste sur le
-- correspondant, dans desk_threads : « ce dossier passe devant aujourd'hui »
-- est vrai d'une personne.
--
-- « Traité » vivra à deux hauteurs, et ce n'est pas un doublon : le message
-- garde le sien, qui dit qu'une pièce de courrier a reçu sa réponse ; l'échange
-- gagne le sien, qui dit que l'affaire est close.

create table if not exists desk_exchanges (
  conv_key text primary key,
  handled_at timestamptz,
  handled_by text,
  snoozed_until timestamptz,
  labels text[] not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by text
);

create index if not exists desk_exchanges_snoozed on desk_exchanges (snoozed_until) where snoozed_until is not null;

comment on table desk_exchanges is
  'L''état d''un échange : traité, reporté, étiqueté. Un échange n''est pas créé, il est constaté : la ligne n''existe que si quelqu''un a posé un de ces gestes.';
comment on column desk_exchanges.labels is
  'Texte libre. Le vocabulaire proposé vit dans le code, pour qu''un mot se renomme sans migration ; ce qui a été écrit reste écrit.';

alter table desk_exchanges enable row level security;
-- Atteinte par le rôle de service seulement : la boîte aux lettres du desk
-- passe par des actions serveur. Aucun accès direct depuis le navigateur.

-- Les étiquettes de desk_threads n'ont plus de sens : elles portaient sur une
-- adresse. La colonne reste en place le temps de la bascule, vide de nouvelles
-- écritures ; elle sera retirée quand plus rien ne la lira. Rien n'est effacé
-- sans qu'on sache ce qu'on efface.
comment on column desk_threads.labels is
  'CADUC depuis 0057 : l''étiquette porte désormais sur l''échange (desk_exchanges.labels), parce qu''elle décrit une affaire et non une personne. Plus écrite ; conservée le temps de la bascule.';
