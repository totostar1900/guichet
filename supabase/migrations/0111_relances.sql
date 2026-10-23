-- LA PROCÉDURE LAISSÉE EN ROUTE, ET LE RAPPEL QUI LA REPREND.
--
-- Un client ouvre son bulletin, lit le montant, va chercher son téléphone pour
-- le code, et ne revient pas. L'ordre existe, le desk l'a préparé, l'argent
-- n'est pas engagé, et plus personne n'en parle. Le Guichet le savait déjà —
-- la pastille le porte — mais la pastille ne se voit que si l'on revient, et
-- le propre de celui qui a abandonné est qu'il ne revient pas.
--
-- POURQUOI UNE TABLE, ET NON UN CALCUL REFAIT À CHAQUE TOUR. Ce qui ATTEND se
-- déduit de l'état : un bulletin non signé, une convention non acceptée. Mais
-- ce qui a été DIT ne se déduit de rien. Combien de rappels sont partis, quand
-- le dernier, et surtout si le client a demandé qu'on se taise : trois faits
-- qui n'existent nulle part ailleurs, et dont le troisième est une promesse.
--
-- LA CLEF EST PRÉCISE, ET C'EST CE QUI REND L'ÉCART SÛR. Si « signature »
-- était une clef unique par client, écarter le rappel d'un bulletin éteindrait
-- aussi celui du bulletin suivant, émis trois semaines plus tard sur un autre
-- ordre. La clef porte donc l'identifiant de l'objet qui attend ; seuls la
-- convention et les compléments, uniques par dossier, en portent le nom.
--
-- CE QUI N'ENTRERA JAMAIS DANS CETTE TABLE : un formulaire rempli et non
-- envoyé. Écrire « vous étiez sur le point de placer 250 000 FCFA » à
-- quelqu'un qui a justement renoncé n'est pas un service, c'est une
-- surveillance. La maison relance ce qu'elle a commencé AVEC le client, et la
-- table ne connaît donc que des objets qui existent parce qu'il a cliqué.

create table if not exists relances (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  sujet       text not null check (sujet in ('convention', 'complements', 'signature', 'contre_proposition', 'mandat')),
  -- L'objet qui attend : un identifiant d'ordre ou de mandat, sinon le nom du
  -- sujet quand il est unique par dossier.
  cle         text not null,
  state       text not null default 'en_cours' check (state in ('en_cours', 'ecartee', 'faite')),
  -- Les rappels RÉELLEMENT partis : un canal qui échoue ne consomme rien, sans
  -- quoi un numéro cassé épuiserait les cinq rappels en cinq silences.
  envois      integer not null default 0 check (envois >= 0),
  -- Le jour du dernier rappel parti, qui tient la règle « un par jour ».
  dernier_on  date,
  -- Le jour où la maison a constaté le devoir : le décompte part de là.
  ouvert_le   date not null,
  clos_le     timestamptz,
  -- Le mot du client quand il écarte : il a le droit de ne rien dire.
  motif       text,
  created_at  timestamptz not null default now()
);

-- Un seul rappel vivant par devoir : deux lignes pour le même bulletin
-- enverraient deux messages le même jour, ce qui est la faute à ne pas faire.
create unique index if not exists relances_une_par_devoir on relances (user_id, sujet, cle);
-- La file du robot : ce qui est en cours, le plus ancien d'abord.
create index if not exists relances_file on relances (state, ouvert_le);
create index if not exists relances_client on relances (user_id, state);

comment on table relances is
  'Ce que la maison a DIT sur un devoir laissé en route : combien de rappels sont partis, quand, et si le client a demandé qu''on se taise. Ce qui attend se déduit de l''état ; ce qui a été dit ne se déduit de rien.';
comment on column relances.envois is
  'Les rappels réellement partis. Un canal qui échoue ne consomme rien : sinon un numéro cassé épuiserait la série en autant de silences.';
comment on column relances.state is
  '« ecartee » est la demande du client, et elle ne se discute pas au desk : les rappels cessent pour ce devoir-là. Le devoir, lui, reste visible dans le Guichet — écarter un rappel n''annule pas un ordre.';

alter table relances enable row level security;
-- Atteinte par le rôle de service seulement : le robot l'écrit, et l'écart du
-- client passe par une action serveur qui le connaît par sa session.
