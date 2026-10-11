-- LE DESK PEUT ENFIN RÉPONDRE À UNE REMARQUE DU LECTEUR.
--
-- Devant une remarque, le desk n'avait qu'un levier : « Relire ». Mesuré le
-- 11 octobre 2026 par essai à blanc sur les 212 séances en attente, ce levier
-- ne rend rien : 208 rendent exactement la même chose. Un desk consciencieux
-- appuyait donc sur un bouton sans effet, et n'avait aucun moyen de dire
-- qu'il avait regardé. La remarque reparaissait le lendemain, identique.
--
-- UN JUGEMENT NE CORRIGE RIEN. Il ne touche ni un cours, ni une VL, ni le
-- statut posé par le lecteur : la lecture de la machine reste intacte et
-- relisible. Il dit « une personne a regardé, voici ce qu'elle a vu », et
-- c'est pour cela qu'il n'ouvre aucun chemin d'écriture vers les données.
--
-- DEUX PORTÉES. Une remarque se juge séance par séance ; mais « Indice BVMAC
-- introuvable » est identique sur 112 séances, et demander 112 gestes aurait
-- garanti que personne n'en fasse aucun. Un jugement de période ferme une
-- famille entière d'une phrase. Seul le motif « pas encore publié » y a
-- droit, parce qu'il affirme quelque chose sur l'histoire de la place, qu'on
-- peut tenir sans ouvrir un document ; les autres motifs affirment quelque
-- chose sur UN document, et personne ne lit 112 PDF.
create table if not exists bulletin_jugements (
  id          uuid primary key default gen_random_uuid(),
  portee      text not null check (portee in ('seance', 'periode')),
  motif       text not null check (motif in ('pas_encore_publie', 'absent_du_document', 'illisible_a_la_source', 'vraie_sortie_de_cote', 'vrai_mouvement')),

  -- Portée « séance » : la séance, et la remarque visée MOT POUR MOT.
  -- On vise la phrase et non un rang : relire une séance réordonne ses
  -- remarques, et un jugement accroché au troisième rang se retrouverait sur
  -- une autre phrase. Conséquence voulue : si la remarque change, le jugement
  -- cesse de s'appliquer et la remarque revient.
  seance      date references market_bulletins (session_date) on delete cascade,
  cible       text,

  -- Portée « période » : la famille de remarques (la lettre) et ses bornes.
  famille     text,
  depuis      date,
  jusquau     date,

  note        text,
  par         uuid not null references auth.users (id),
  at          timestamptz not null default now(),

  -- Retiré, jamais supprimé : un jugement faux doit laisser sa trace, et tout
  -- ce qu'il fermait doit pouvoir revenir.
  retire_le   timestamptz,
  retire_par  uuid references auth.users (id),

  constraint jugement_seance_complet check (portee <> 'seance' or (seance is not null and cible is not null)),
  constraint jugement_periode_complet check (portee <> 'periode' or (famille is not null and (depuis is not null or jusquau is not null))),
  -- Un jugement de période ne peut porter que le motif qui parle de l'histoire
  -- de la place. La règle est dans le domaine ; elle est aussi ici, parce
  -- qu'une règle qui n'existe qu'en TypeScript se contourne par un script.
  constraint jugement_periode_motif check (portee <> 'periode' or motif = 'pas_encore_publie')
);

-- Deux fois le même jugement vivant sur la même remarque n'ajoute rien et
-- ferait compter deux fois. L'index est partiel : un jugement retiré ne
-- bloque pas le suivant, sinon une erreur serait définitive.
create unique index if not exists bulletin_jugements_seance_unique
  on bulletin_jugements (seance, cible) where retire_le is null and portee = 'seance';
create unique index if not exists bulletin_jugements_periode_unique
  on bulletin_jugements (famille, coalesce(depuis, '1900-01-01'::date), coalesce(jusquau, '2999-12-31'::date))
  where retire_le is null and portee = 'periode';

create index if not exists bulletin_jugements_famille_idx on bulletin_jugements (famille) where retire_le is null;

comment on table bulletin_jugements is
  'Ce qu''une personne a répondu à une remarque du lecteur. Ne corrige aucune donnée : la lecture de la machine reste intacte. Déplace seulement l''attente.';

alter table bulletin_jugements enable row level security;

-- Le desk lit, écrit et retire ; personne d'autre ne voit ces lignes. Un
-- jugement nomme un défaut de lecture et la personne qui l'a tranché : rien
-- là-dedans ne regarde un client. is_desk() couvre opérateur et responsable,
-- et le second regard n'a pas lieu d'être ici : un jugement ne déplace aucun
-- argent, ne corrige aucune donnée, et se retire d'un geste.
drop policy if exists "desk lit les jugements" on bulletin_jugements;
create policy "desk lit les jugements" on bulletin_jugements for select using (is_desk());
drop policy if exists "desk juge" on bulletin_jugements;
create policy "desk juge" on bulletin_jugements for insert with check (is_desk());
drop policy if exists "desk retire un jugement" on bulletin_jugements;
create policy "desk retire un jugement" on bulletin_jugements for update using (is_desk());
