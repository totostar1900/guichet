-- LA PAGE, ET LE MOTIF QUI MANQUAIT.
--
-- Les cinq motifs d'origine voulaient tous dire « cesse de demander ». Devant
-- le bulletin du 22 décembre 2023, aucun ne permettait de dire « la ligne est
-- là, page 2, parfaitement lisible, c'est le lecteur qui l'a manquée » : le
-- plus proche affirmait que le document est illisible à cet endroit, ce qui
-- est faux. Une liste fermée à laquelle manque le motif vrai ne produit pas
-- du silence, elle produit des faux signés.
--
-- Le sixième ne FERME pas la remarque, il la redirige vers le lecteur : la
-- séance quitte la pile « une personne doit regarder » pour la pile « le
-- lecteur doit être corrigé », et elle y reste jusqu'à ce qu'il le soit.
alter table bulletin_jugements add column if not exists page int;

comment on column bulletin_jugements.page is
  'La page du document où la personne a regardé. Exigée par les motifs qui affirment quelque chose sur un endroit : sans elle, l''affirmation n''est pas vérifiable.';

alter table bulletin_jugements drop constraint if exists bulletin_jugements_motif_check;
alter table bulletin_jugements add constraint bulletin_jugements_motif_check
  check (motif in ('pas_encore_publie', 'absent_du_document', 'illisible_a_la_source', 'vraie_sortie_de_cote', 'vrai_mouvement', 'le_lecteur_l_a_manquee'));

-- Les trois motifs qui parlent d'un ENDROIT exigent la page, et la base le
-- tient aussi : une règle qui n'existe qu'en TypeScript se contourne par un
-- script.
alter table bulletin_jugements drop constraint if exists jugement_page_exigee;
alter table bulletin_jugements add constraint jugement_page_exigee
  check (motif not in ('absent_du_document', 'illisible_a_la_source', 'le_lecteur_l_a_manquee') or page is not null);
