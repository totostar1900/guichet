-- Le préavis : prévenir avant, et laisser le temps de dire non.
--
-- Le robot replaçait l'argent, PUIS prévenait. Et l'envoi du message vivait dans
-- un try/catch vide avec ce commentaire : « un message qui ne part pas ne doit
-- pas empêcher le versement suivant ». C'était vrai pour le versement suivant,
-- et faux pour celui-là : la maison engageait l'argent d'un client qui n'avait
-- rien reçu, et personne ne le savait.
--
-- Une banque qui vous informe d'un prélèvement après l'avoir fait vous informe.
-- Elle ne vous laisse pas décider.
--
-- POURQUOI UNE TABLE, ET NON UN CALCUL FAIT DEUX FOIS. Un versement programmé
-- se prévoit : son jour est écrit dans l'instruction. Un réinvestissement ne se
-- prévoit pas, c'est l'argent arrivé qui le déclenche, et « demain » n'est pas
-- connaissable d'avance. L'occurrence annoncée doit donc exister comme objet :
-- elle naît d'un préavis, elle vit le temps du délai, et elle meurt exécutée ou
-- arrêtée. Un calcul refait à l'exécution ne saurait pas ce qui a été annoncé,
-- donc ne saurait pas s'il tient sa promesse.
--
-- LES DEUX RÈGLES QUI TIENNENT CETTE TABLE :
--
--   PAS D'EXÉCUTION SANS PRÉAVIS RÉELLEMENT PARTI. Un préavis qui échoue laisse
--   l'occurrence en vie sans l'exécuter, et le désigne. Le risque est qu'un
--   client au canal cassé n'ait plus de versement : c'est assumé, parce que
--   l'inverse est d'engager son argent en silence, et que le desk voit la file.
--
--   AU PLUS LE MONTANT ANNONCÉ. Entre le préavis et l'exécution, un coupon peut
--   tomber. Exécuter plus que ce qui a été annoncé romprait la promesse sur
--   laquelle le client a choisi de ne rien dire ; le surplus aura son propre
--   préavis le lendemain. Moins est permis : l'argent a pu partir.

create table if not exists standing_runs (
  id           uuid primary key default gen_random_uuid(),
  standing_id  uuid not null,
  user_id      uuid not null,
  -- Le jour prévu de l'exécution. Pour un versement, le jour choisi par le
  -- client ; pour un réinvestissement, le préavis plus le délai.
  due_on       date not null,
  -- Le montant annoncé : c'est le plafond de ce qui sera exécuté.
  amount       numeric(18, 2) not null check (amount > 0),
  announced_at timestamptz not null default now(),
  -- Le préavis est-il réellement parti ? Faux bloque l'exécution, à dessein.
  notice_sent  boolean not null default false,
  notice_error text,
  state        text not null default 'annoncee' check (state in ('annoncee', 'arretee', 'executee', 'perimee')),
  closed_at    timestamptz,
  -- Le mot du client quand il arrête : il a le droit de ne rien dire.
  stop_reason  text,
  intent_id    uuid,
  paid_amount  numeric(18, 2),
  constraint standing_runs_execution_chiffree check (state <> 'executee' or (paid_amount is not null and paid_amount > 0))
);

-- Une seule occurrence par instruction et par jour prévu : deux préavis pour le
-- même versement produiraient deux ordres, ce qui est la faute à ne pas faire.
create unique index if not exists standing_runs_une_par_occurrence on standing_runs (standing_id, due_on);
create index if not exists standing_runs_file on standing_runs (state, due_on);
create index if not exists standing_runs_client on standing_runs (user_id, announced_at desc);

comment on column standing_runs.amount is
  'Le montant annoncé, qui est le plafond de l''exécution. Exécuter plus romprait la promesse sur laquelle le client n''a rien dit.';
comment on column standing_runs.notice_sent is
  'Faux bloque l''exécution. Engager l''argent d''un client qui n''a rien reçu est pire qu''un versement manqué.';

alter table standing_runs enable row level security;
-- atteinte par le rôle de service seulement : le robot l'écrit, l'arrêt du
-- client passe par une action serveur qui le connaît par sa session.
