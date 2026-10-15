-- UNE SEANCE, UNE LIGNE : LA CLEF N EST PAS L ADRESSE DE LA PIECE.
--
-- La BEAC publie la meme seance deux fois, en francais et en traduction
-- espagnole ou anglaise. Le depot se cloturait sur `source_url`, ce qui etait
-- juste tant qu une seance n avait qu une adresse : la porte ouverte le
-- 15 octobre 2026 a fait entrer les traductions, et trente-huit seances se
-- sont mises a compter double. Dix autres l etaient deja par une variante de
-- code (« CM2J000000063 » pour « CM2J00000063 »).
--
-- CE QUI IDENTIFIE UNE SEANCE est le Tresor qui emet, le jour ou il adjuge,
-- et la ligne qu il ouvre. Les deux pieces restent a la bibliotheque : ce
-- sont deux documents, ce n est pas deux seances.
--
-- LES LIGNES SANS CODE NE SE HEURTENT PAS, Postgres tenant deux NULL pour
-- distincts. C est voulu : six communiques n impriment pas de code, et le
-- Gabon a adjuge un BTA et un OTA le 12 juin 2019 sans en nommer aucun.
-- Les confondre perdrait une seance au lieu d en empecher une.
create unique index if not exists auction_results_seance_unique
  on public.auction_results (country, session_on, code_emission);

-- Et l ancienne clef cesse d etre une clef : une seance a deux adresses
-- possibles, et refuser la seconde empecherait de citer l original francais
-- quand c est la traduction qui avait ete deposee la premiere.
alter table public.auction_results drop constraint if exists auction_results_source_url_key;

create index if not exists auction_results_source_url_idx on public.auction_results (source_url);
