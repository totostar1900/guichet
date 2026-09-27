-- Quand la machine a lu cette pièce, et avec quel modèle.
--
-- La file de lecture se gardait de relire une pièce dont un passage précédent
-- n'avait rien tiré, et elle reconnaissait ce passage à « updated_at »
-- postérieur à « created_at ». Le raccourci était faux : n'importe quelle
-- écriture bouge « updated_at », et le robot d'ingestion réécrit chaque ligne
-- à chacun de ses passages. Deux tours d'ingestion sur le Gabon ont donc
-- marqué ses quatre-vingt-quinze séances comme « déjà tentées » sans qu'aucune
-- n'ait jamais été présentée au lecteur, et la file s'est déclarée vide en
-- laissant cent vingt communiqués parfaitement lisibles de côté.
--
-- Une lecture se marque donc elle-même. « read_at » dit qu'un lecteur est
-- passé, « read_model » dit lequel : sans le second, comparer deux campagnes
-- de lecture revient à comparer deux impressions, et le choix d'un modèle est
-- devenu une ligne de dépense qui se justifie par des chiffres.
--
-- Les deux colonnes se remplissent que la lecture ait donné quelque chose ou
-- non. C'est tout leur intérêt : une pièce dont on ne tire rien est un fait à
-- retenir, pas une tentative à recommencer indéfiniment.

alter table auction_results add column if not exists read_at    timestamptz;
alter table auction_results add column if not exists read_model text;

comment on column auction_results.read_at is 'Dernier passage du lecteur automatique sur cette pièce, qu''il en ait tiré quelque chose ou non. Vide : jamais lue.';
comment on column auction_results.read_model is 'Le modèle de ce passage. Comparer deux campagnes suppose de savoir laquelle vient de qui.';

-- Ce qui a déjà été lu pour de bon se reconnaît à ses chiffres : ces séances
-- là n'ont pas à repasser devant le lecteur, et la colonne le dit plutôt que
-- de laisser la file le redécouvrir une pièce à la fois.
update auction_results
   set read_at = updated_at
 where read_at is null
   and (rate_avg is not null or rate_limit is not null or price_avg is not null or price_limit is not null);
