-- Le rendement d'une séance, et de quoi le calculer quand il n'est pas imprimé.
--
-- La table savait ranger deux familles de chiffres qui ne se comparent pas : un
-- bon s'adjuge à un taux, une obligation à un prix. Tant qu'on regarde une
-- séance à la fois, cela suffit. Dès qu'on trace une courbe, cela ne suffit
-- plus : un prix de 95,00 % et un taux de 6,70 % ne se posent pas sur le même
-- axe, et la courbe de la zone s'arrêtait donc à douze mois, là où les bons
-- s'arrêtent.
--
-- Cinq colonnes, et trois chemins vers un rendement.
--
--   « yield_avg » et « yield_limit » : le rendement quand le Trésor l'imprime.
--   Le Cameroun le fait déjà, sous le libellé « taux de rendement moyen
--   pondéré », à côté d'un prix moyen exprimé en francs par titre. Le lecteur
--   automatique le relevait depuis le premier jour et le jetait faute de
--   colonne où le mettre. C'est la source la meilleure : rien n'est supposé.
--
--   « coupon_rate » : le taux d'intérêt facial de l'obligation. Avec lui, le
--   prix adjugé donne un rendement actuariel par le calcul, sans rien
--   demander à personne. Sans lui, un prix reste un prix : 95,00 % ne dit rien
--   tant qu'on ignore ce que la ligne paie chaque année.
--
--   « maturity_on » : l'échéance imprimée. La durée annoncée (« 3 ans ») sert
--   à comparer des produits ; l'échéance sert à calculer, et les deux ne
--   tombent pas toujours sur le même nombre d'années.
--
--   « price_avg_fcfa » : le prix moyen quand le Trésor l'exprime en francs par
--   titre (9 899,45) plutôt qu'en pourcentage. La conversion se fait dans le
--   code, sur une valeur nominale de 10 000 francs, et elle est déclarée comme
--   une hypothèse partout où elle sert.
--
-- Aucune de ces colonnes n'est obligatoire : ce qui n'est pas imprimé reste
-- vide, et un blanc se voit là où une valeur déduite se confondrait avec une
-- valeur lue.

alter table auction_results add column if not exists yield_avg       numeric(9,4);
alter table auction_results add column if not exists yield_limit     numeric(9,4);
alter table auction_results add column if not exists coupon_rate     numeric(9,4);
alter table auction_results add column if not exists maturity_on     date;
alter table auction_results add column if not exists price_avg_fcfa  numeric(18,2);

comment on column auction_results.yield_avg is 'Taux de rendement moyen pondéré, en %, tel que le Trésor l''imprime. Jamais calculé : le calcul vit dans src/lib/market/yield.ts et se déclare comme tel.';
comment on column auction_results.yield_limit is 'Taux de rendement au prix limite, en %, tel qu''imprimé.';
comment on column auction_results.coupon_rate is 'Taux d''intérêt facial de l''obligation, en %. Avec le prix, il donne le rendement actuariel.';
comment on column auction_results.maturity_on is 'Échéance imprimée sur le communiqué. La durée annoncée compare, l''échéance calcule.';
comment on column auction_results.price_avg_fcfa is 'Prix moyen pondéré en FCFA par titre, quand le Trésor l''exprime ainsi. Converti en pourcentage dans le code, sur une VN de 10 000 F, hypothèse déclarée.';
