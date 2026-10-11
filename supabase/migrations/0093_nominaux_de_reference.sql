-- LE DERNIER NOMINAL NON NUL DE CHAQUE OBLIGATION, EN UNE SEULE REQUÊTE.
--
-- C'est la seconde identité du lecteur : sur une ligne amortissable le prix
-- reste rapporté au nominal qui courait avant le remboursement du capital, et
-- le bulletin finit par imprimer zéro.
--
-- POURQUOI UNE FONCTION, ET NON LA BOUCLE D'AVANT. La première version prenait
-- la dernière cotation de chaque ligne, puis reprenait l'historique ligne par
-- ligne pour celles qui portaient un zéro : une requête, plus une par ligne
-- concernée, et cela UNE FOIS PAR SÉANCE. Mesuré le 11 octobre 2026 pendant la
-- reprise de l'arriéré : dix secondes par séance au lieu de quatre, et le
-- plafond de trois cents secondes de la fonction tuait un tour de soixante
-- séances. Ici c'est une requête, et elle rend exactement la même chose.
--
-- « distinct on » avec l'ordre (isin, session_date desc) se sert de l'index
-- unique (isin, session_date) que la table porte déjà.
create or replace function nominaux_de_reference(avant date)
returns table (isin text, nominal numeric)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (q.isin) q.isin, q.nominal_remaining
  from quotes q
  where q.instrument = 'obligation'
    and q.session_date < avant
    and q.nominal_remaining is not null
    and q.nominal_remaining > 0
  order by q.isin, q.session_date desc;
$$;

comment on function nominaux_de_reference is
  'Le dernier nominal non nul de chaque obligation strictement avant une date. Sert la seconde identité du lecteur : sur une ligne amortissable, le prix est rapporté à ce nominal et non à celui du jour, que le bulletin imprime parfois à zéro.';

-- Seul le lecteur s'en sert, et il tourne avec la clef de service.
revoke all on function nominaux_de_reference(date) from public;
grant execute on function nominaux_de_reference(date) to service_role;

-- L'INDEX QUI REND LA REQUÊTE UTILISABLE, et il a été mesuré.
-- Sans lui, « distinct on (isin) » balaie 15 905 lignes pour en rendre 39 :
-- l'index (isin, session_date) existant sert l'ordre, mais chaque ligne est
-- ensuite filtrée sur l'instrument et le nominal. L'index partiel porte le
-- filtre lui-même, donc la recherche saute directement à la première ligne
-- utile de chaque obligation. Mesuré : 956 ms avant, 18 ms après.
create index if not exists quotes_nominal_reference_idx
  on quotes (isin, session_date desc)
  where instrument = 'obligation' and nominal_remaining > 0;

comment on index quotes_nominal_reference_idx is
  'Sert nominaux_de_reference() : le dernier nominal non nul de chaque obligation avant une date.';
