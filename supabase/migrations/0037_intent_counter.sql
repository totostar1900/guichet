-- La contre-proposition : d'autres conditions, soumises au client.
--
-- Un ordre se confirmait, se transmettait ou se clôturait. Rien ne permettait
-- de dire « pas à ce prix-là, mais à celui-ci », ni « pas cent titres, mais
-- quarante » : or c'est ce qu'un carnet étroit impose presque à chaque séance.
-- Le desk n'avait alors que deux issues, exécuter autrement que demandé, ce
-- qu'on ne fait pas, ou clore, ce qui perd l'ordre.
--
-- Ce que la colonne garde, en un seul objet parce que c'est un seul acte :
--   amount     la quantité proposée, quand elle change
--   limitPrice le prix proposé, quand il change
--   note       la phrase du desk, celle que le client lit
--   until      la date au-delà de laquelle elle ne vaut plus
--   by         qui l'a faite
--   at         quand
--
-- L'échéance n'est pas une politesse : un prix ne tient pas. Passée l'heure,
-- la proposition est caduque et l'ordre revient au desk tel qu'il était.
--
-- L'acceptation du client est l'acte qui engage, pas le clic du desk : c'est
-- une offre que nous faisons, et son oui la transforme en ordre. D'où l'état
-- `contre_proposee`, qui n'est ni confirmé ni clos, et qui attend.

alter table public.intents add column if not exists counter jsonb;

comment on column public.intents.counter is 'Contre-proposition du desk : quantité, prix, phrase, échéance, auteur. L''acceptation du client la reporte sur l''ordre.';
