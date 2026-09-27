-- Une anomalie vérifiée sur la pièce cesse de se signaler.
--
-- Le crible des anomalies a trouvé vingt-cinq contradictions ; sept venaient de
-- nous et sont corrigées, seize viennent des Trésors eux-mêmes. Le Gabon publie
-- un prix moyen au-dessus de son propre maximum, le Tchad un servi supérieur
-- aux soumissions, le Cameroun le même montant sur les cinq lignes d'une
-- séance : les pièces disent cela, et notre lecture est fidèle.
--
-- Or rien ne permettait de le noter. Le panneau aurait donc affiché seize
-- anomalies indéfiniment, et c'est la façon la plus sûre de le rendre
-- invisible : la maison a déjà vu le lecteur de bulletins signaler soixante
-- lectures partielles pendant un an sans que personne n'agisse, parce que rien
-- ne changeait jamais.
--
-- Une anomalie vérifiée est donc rangée sur la séance, par sa clef de motif.
-- Elle ne disparaît pas : elle se compte à part, et la liste des motifs
-- acceptés reste lisible. Si le crible trouve plus tard un autre motif sur la
-- même séance, celui-là se signalera, n'ayant pas été vu.

alter table auction_results add column if not exists anomalies_vues text[] not null default '{}';

comment on column auction_results.anomalies_vues is 'Motifs d''anomalie vérifiés sur la pièce : la contradiction vient de la source, la lecture est fidèle. Le panneau les compte à part au lieu de les répéter.';
