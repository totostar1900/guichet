-- Guichet · l'état d'un fil de conversation : épinglé, reporté, étiqueté
--
-- ─── Pourquoi une table, et pas des colonnes sur les messages ───────────────
--
-- Épingler, reporter et étiqueter s'appliquent à la CONVERSATION, pas à un
-- message. Un fil existe avant qu'un seul de ses messages soit traité, il
-- continue d'exister quand un nouveau message arrive, et son étiquette doit
-- survivre aux deux. Porté par les messages, l'état se serait dédoublé à chaque
-- arrivée, et il aurait fallu décider lequel fait foi.
--
-- La clef est (canal, adresse), exactement ce qui identifie un fil dans la boîte
-- aux lettres : un numéro WhatsApp ou une adresse de courriel. Pas d'identifiant
-- technique : un fil n'est pas créé, il est constaté.
--
-- ─── « Reporter » porte une date, et ce n'est pas un détail ─────────────────
--
-- Le desk n'avait que deux issues pour un fil qu'il ne peut pas traiter tout de
-- suite : le marquer traité à tort, ou le laisser non lu pour toujours. Les
-- deux mentent, et la seconde finit par noyer la file sous ce qu'on a décidé
-- d'ignorer.
--
-- Un drapeau « à revoir » aurait le même défaut : il ne revient jamais tout
-- seul. « snoozed_until » dit QUAND, donc le fil sort de la file et y rentre de
-- lui-même. Une date passée vaut un fil rendu : rien à nettoyer, rien à faire
-- tourner.
--
-- ─── Les étiquettes vivent en code, pas en base ─────────────────────────────
--
-- « labels » est un tableau de texte libre, et le vocabulaire (régulateur,
-- ordre, réclamation, KYC) se tient dans src/app/desk/messages/etiquettes.ts.
-- Une table de référence aurait demandé une migration pour renommer un mot, et
-- la maison renomme ses mots. Ce qui a été écrit reste écrit : une étiquette
-- retirée du vocabulaire ne disparaît pas des fils qui la portent, elle cesse
-- seulement d'être proposée.
--
-- ─── Ce qui N'EST PAS ici ──────────────────────────────────────────────────
--
-- « Traité » reste sur les messages (inbound_messages.handled_at), là où il a
-- toujours été : il dit qu'une PIÈCE DE COURRIER a reçu sa réponse, et c'est
-- une propriété du message. Ce que la migration ajoute de ce côté est son
-- inverse, qui manquait : voir markInboundUnhandled. Marquer traité était une
-- porte à sens unique, et un clic de trop sortait un fil de la file sans retour.

create table if not exists desk_threads (
  channel text not null check (channel in ('whatsapp', 'email')),
  addr text not null,
  pinned_at timestamptz,
  snoozed_until timestamptz,
  labels text[] not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by text,
  primary key (channel, addr)
);

-- La liste se lit d'un coup à chaque ouverture de la page : l'index sert les
-- deux tris qui comptent, l'épinglé d'abord et le reporté qui revient.
create index if not exists desk_threads_pinned on desk_threads (pinned_at desc nulls last);
create index if not exists desk_threads_snoozed on desk_threads (snoozed_until) where snoozed_until is not null;

comment on table desk_threads is
  'L''état d''un fil de la boîte aux lettres du desk, par canal et adresse : épinglé, reporté, étiqueté. Un fil n''est pas créé, il est constaté : la ligne n''existe que si quelqu''un a posé un de ces trois gestes.';
comment on column desk_threads.snoozed_until is
  'Le fil sort de la file et y rentre de lui-même à cette date. Une date passée vaut un fil rendu : rien à nettoyer, aucun robot à faire tourner.';
comment on column desk_threads.labels is
  'Texte libre. Le vocabulaire proposé vit dans le code, pour qu''un mot se renomme sans migration ; ce qui a été écrit reste écrit.';

alter table desk_threads enable row level security;
-- Atteinte par le rôle de service seulement : la boîte aux lettres du desk
-- passe par des actions serveur. Aucun accès direct depuis le navigateur.
