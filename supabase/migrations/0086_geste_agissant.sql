-- QUI A FAIT LE GESTE, QUAND LE COMPTE EST À PLUSIEURS.
--
-- Le registre des gestes range tout sous l'identifiant du COMPTE, ce qui est
-- juste : c'est le compte qui agit. Mais pour une société, une association
-- ou une indivision, deux ou trois personnes partagent ce compte, et
-- « le compte a déposé un ordre » ne répond pas à la question que l'on pose
-- toujours en premier : lequel d'entre eux.
--
-- Vide, c'est le titulaire lui-même, et c'est l'immense majorité des lignes.
alter table client_actions add column if not exists agissant text;

comment on column client_actions.agissant is
  'Le nom de la personne qui a fait le geste, quand ce n''est pas le titulaire lui-même : un représentant légal ou un cotitulaire désigné agissant sur le compte d''une personne morale, d''une association ou d''une indivision. Vide, c''est le titulaire.';
