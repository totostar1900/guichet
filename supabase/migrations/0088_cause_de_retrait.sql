-- POURQUOI UN ACCÈS EST RETIRÉ, PRIS DANS UNE LISTE FERMÉE.
--
-- Une mesure vit sur le COMPTE, et c'est juste : les manquements qu'elle
-- sanctionne sont des faits du compte. Mais sur un compte à plusieurs mains
-- elle les frappe toutes, et quand le problème est UNE personne, suspendre
-- le compte punit deux innocents et leur apprend qu'il se passe quelque
-- chose : exactement ce que le silence de la conformité cherche à éviter.
--
-- Le retrait d'un accès est donc l'outil par personne, et il mérite la même
-- rigueur qu'une mesure. La cause décide aussi de ce que la personne lit ;
-- sans elle, elle se connectait, n'arrivait sur rien, et croyait à une
-- panne, sans même un compte où se plaindre.
alter table acces_compte add column if not exists revoque_cause text;

comment on column acces_compte.revoque_cause is
  'La cause du retrait, prise dans une liste fermée (quitte | remplace | demande_du_titulaire | verification) : une cause qui se réécrit n''est pas contestable. Elle décide aussi de ce que la personne lit, et la cause de conformité ne lui dit rien. revoque_motif reste la note libre du desk.';

comment on column acces_compte.revoque_motif is
  'La note libre du desk sur le retrait, pour la personne suivante. Ce n''est jamais ce que lit l''intéressé : c''est revoque_cause qui le décide.';
