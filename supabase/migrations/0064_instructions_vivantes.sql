-- Trois demandes sur les instructions permanentes, et une conséquence.
--
-- 1. MODIFIER UNE INSTRUCTION ACTIVE. Elle a produit de vrais ordres, et ces
--    ordres la désignent par son identifiant. La modifier en place ferait
--    mentir le passé : un ordre de 50 000 pointerait vers une instruction qui
--    dit 80 000, et personne ne saurait plus sous quels termes il est parti.
--
--    Une modification est donc un REMPLACEMENT. L'ancienne passe à
--    « remplacee », garde ses ordres et ses termes, et la nouvelle dit laquelle
--    elle remplace. La chaîne est l'histoire des versions, et c'est la même
--    règle que le journal des espèces : on ne réécrit pas, on en passe une
--    autre.
--
-- 2. LES INSTRUCTIONS ARRÊTÉES NE SE SUPPRIMENT PAS. Elles portent la trace
--    d'ordres réellement exécutés, et un client qui voudrait « faire le
--    ménage » effacerait le lien entre son argent et la raison pour laquelle il
--    est parti. Elles se masquent, ce qui répond au besoin sans couper la
--    piste. Rien à ajouter en base pour cela : c'est un filtre d'écran, et le
--    dire ici plutôt que de laisser croire qu'il manque une colonne.
--
-- 3. PLUSIEURS DESTINATIONS, selon une clé que LE CLIENT écrit. « 60 % sur X,
--    40 % sur Y ». La clé est la sienne : une clé choisie par la maison serait
--    de la gestion, et la maison n'a pas cet agrément. Elle vit dans la même
--    ligne parce qu'elle fait partie des termes de l'ordre, au même titre que
--    le montant et le jour.
--
-- ET LA CONSÉQUENCE, qui n'était pas dans la demande. Depuis le préavis, une
-- occurrence peut être annoncée quand le client modifie ses termes. Sans rien
-- faire, le robot exécuterait le lendemain ce qui a été annoncé, c'est-à-dire
-- les ANCIENS termes, sur une instruction que le client vient de changer. La
-- modification périme donc l'occurrence ouverte, et la nouvelle instruction en
-- annonce une au prochain tour.

alter table standing_orders add column if not exists supersedes uuid;
-- La clé de répartition : [{ "offerId": "...", "pct": 60 }, …]. Vide ou absente,
-- la destination unique de « offer_id » reçoit tout.
alter table standing_orders add column if not exists splits jsonb;

comment on column standing_orders.supersedes is
  'L''instruction que celle-ci remplace. La chaîne est l''histoire des versions : on ne réécrit pas une instruction qui a produit des ordres.';
comment on column standing_orders.splits is
  'La clé de répartition écrite par le client. Une clé choisie par la maison serait de la gestion.';

-- « remplacee » rejoint les quatre états : une instruction remplacée n'est ni
-- arrêtée par le client, ni terminée par son terme, et les confondre perdrait
-- la raison pour laquelle elle a cessé.
do $$
begin
  alter table standing_orders drop constraint if exists standing_orders_state_check;
  alter table standing_orders add constraint standing_orders_state_check
    check (state in ('active', 'suspendue', 'terminee', 'annulee', 'remplacee'));
end $$;

create index if not exists standing_orders_lignee on standing_orders (supersedes) where supersedes is not null;

-- Une occurrence annoncée peut produire PLUSIEURS ordres quand la clé partage.
-- « intent_id » gardait le cas unique ; la liste garde les autres, et les deux
-- disent la même chose quand il n'y a qu'une destination.
alter table standing_runs add column if not exists intents jsonb;

comment on column standing_runs.intents is
  'Les ordres produits par cette occurrence. Plusieurs quand la clé de répartition partage le montant.';
