-- UNE CORRECTION DE CHIFFRE PORTE SA TRACE, OU ELLE N'EST PAS UNE CORRECTION.
--
-- Le Tresor du Tchad a imprime, le 24 janvier 2024, son OTA a 2 ans sous un
-- en-tete « en millions de FCFA » avec des nombres qui sont en milliers : le
-- BTA de la MEME PAGE porte « 2703 » quand l'OTA porte « 16678630 ». Un
-- Tresor n'adjuge pas 2,7 milliards et 16 678 milliards le meme jour. La
-- faute est dans la piece, notre lecture etait fidele.
--
-- Changer le nombre sans rien dire effacerait les deux choses qui comptent :
-- CE QUE LA PIECE IMPRIME, qui reste la reference opposable, et QUI A DECIDE
-- de s'en ecarter. Ces trois colonnes sont la symetrie de set_aside_* : une
-- mise a l'ecart porte deja son motif, une correction doit porter le sien.
alter table public.auction_results
  add column if not exists correction text,
  add column if not exists corrected_by text,
  add column if not exists corrected_at timestamptz;

comment on column public.auction_results.correction is
  'Ce que la piece imprime, ce qui a ete retenu, et ce qui le justifie. Vide : aucun chiffre n''a ete touche.';
comment on column public.auction_results.corrected_by is
  'La personne qui a decide de s''ecarter de la piece. Un robot ne corrige pas un Tresor.';
