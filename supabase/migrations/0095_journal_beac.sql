-- LE JOURNAL DES ANNONCES DE LA BEAC : CE QU'ON A VU, ET QUAND.
--
-- POURQUOI UNE TABLE EN AJOUT SEUL. La page d'annonces de la BEAC est lue
-- toutes les heures depuis des mois, et jetée : zéro adjudication à venir en
-- base. Or une adjudication programmée puis annulée ne laisse AUCUNE trace
-- ailleurs : la page montre l'état courant, et le passé d'un calendrier
-- n'existe nulle part. C'est la seule matière de ce chantier qui se perd en
-- temps réel.
--
-- Une table d'état courant, mise à jour, écraserait précisément ce qu'on veut
-- étudier. On écrit donc des OBSERVATIONS : chacune dit ce que la BEAC
-- affichait à une date donnée, et rien ne les modifie ensuite.
--
--   une ligne qui apparaît              un ajout au calendrier
--   une ligne dont le contenu change    une révision, datée
--   une ligne absente (present = false) une annulation ou un report
--
-- CE QUE CE JOURNAL NE PEUT PAS DIRE, et il faut l'écrire ici plutôt que de
-- le découvrir plus tard : la liste des annonces ne porte PAS les montants.
-- Pays, instrument, maturité et date de séance se lisent dans le titre ; le
-- montant annoncé est à l'intérieur du PDF. Ce journal donne donc les ajouts,
-- les annulations et les reports, pas les révisions de montant. Celles-là
-- demanderont la lecture des documents.
--
-- ON N'ÉCRIT QUE CE QUI CHANGE. Une observation identique à la dernière
-- connue pour la même adresse n'est pas réécrite : à mille documents et vingt
-- -quatre lectures par jour, le journal pèserait sinon huit millions de
-- lignes par an pour dire que rien ne bouge.

create table if not exists beac_observations (
  id          uuid primary key default gen_random_uuid(),
  -- L'identité du document chez la BEAC. Son adresse est unique et stable.
  url         text        not null,
  vu_le       timestamptz not null default now(),
  -- Faux quand le document a DISPARU de la page : c'est le signal d'annulation.
  present     boolean     not null default true,
  titre       text        not null default '',
  genre       text,                 -- annonce | resultats | calendrier | autre
  pays        text,
  instrument  text,                 -- BTA | OTA
  tenor       text,                 -- « 26 semaines », « 3 ans »
  seance      date,                 -- la date de séance lue dans le titre
  abondement  boolean     not null default false,
  -- L'empreinte du contenu utile : elle décide s'il y a lieu d'écrire.
  empreinte   text        not null,
  created_at  timestamptz not null default now()
);

comment on table beac_observations is
  'Journal en ajout seul des annonces de la BEAC : une ligne par changement observé, jamais de mise à jour. Les révisions de montant n''y figurent pas, la liste ne les porte pas.';
comment on column beac_observations.present is
  'Faux lorsque le document a disparu de la page : annulation ou report.';
comment on column beac_observations.empreinte is
  'Hachage du contenu utile. Une observation identique à la précédente pour la même url n''est pas réécrite.';

-- La dernière observation d'un document, qui est la question posée à chaque tour.
create index if not exists beac_observations_url_idx on beac_observations (url, vu_le desc);
-- Le calendrier à venir, et les séances d'une période.
create index if not exists beac_observations_seance_idx on beac_observations (seance) where seance is not null;
create index if not exists beac_observations_vu_le_idx on beac_observations (vu_le desc);

alter table beac_observations enable row level security;

-- Le journal se lit du desk, et s'écrit par le robot, qui passe par la clef
-- de service : aucune politique d'écriture n'est donc ouverte au client.
drop policy if exists "desk lit le journal beac" on beac_observations;
create policy "desk lit le journal beac" on beac_observations for select using (is_desk());
