-- Le passage d'un fonds à un autre, en une instruction du client.
--
-- Aujourd'hui, un client qui veut quitter un fonds pour un autre passe deux
-- ordres sans rapport l'un avec l'autre : un rachat, puis, s'il y pense et
-- quand il y pense, une souscription. Entre les deux, son argent est sorti du
-- marché et personne ne le lui rappelle. Le desk, de son côté, voit passer deux
-- ordres qu'aucun lien ne rapproche : il ne peut ni préparer le second, ni
-- s'apercevoir que le client a oublié de le passer.
--
-- Deux colonnes suffisent à faire de ces deux ordres une opération, et c'est
-- délibérément tout ce qu'elles font : le rachat et la souscription restent des
-- ordres ordinaires, exécutés, documentés et réglés par la machinerie qui
-- existe. Un passage n'est pas un instrument de plus, c'est un fil entre deux
-- ordres.
--
--   « switch_to_offer »    sur le rachat : le fonds de destination, choisi par
--                          le client au moment où il demande à sortir.
--   « switch_from_intent » sur la souscription : le rachat dont elle emploie le
--                          produit.
--
-- Le montant de la souscription n'est pas connu quand le client demande le
-- passage : il vaut les parts rachetées à leur valeur liquidative, nette des
-- droits de sortie, et cette valeur se publie après. D'où deux temps, et deux
-- colonnes plutôt qu'une : la destination est une intention du client, le lien
-- est un fait que le desk constate une fois le rachat exécuté.
--
-- Rien n'est contraint en base : une intention peut toujours vivre seule, et
-- les deux colonnes restent vides sur l'immense majorité des ordres.

alter table intents add column if not exists switch_to_offer text;
alter table intents add column if not exists switch_from_intent text;

comment on column intents.switch_to_offer is
  'Passage : le fonds de destination, porté par le rachat.';
comment on column intents.switch_from_intent is
  'Passage : le rachat dont cette souscription emploie le produit.';

-- Retrouver les deux bouts d'un passage sans balayer la table : le desk le fait
-- à chaque exécution de rachat, pour savoir s'il reste une souscription à créer.
create index if not exists intents_switch_to_offer_idx
  on intents (switch_to_offer)
  where switch_to_offer is not null;
create index if not exists intents_switch_from_intent_idx
  on intents (switch_from_intent)
  where switch_from_intent is not null;
