-- Le journal des espèces d'un client.
--
-- L'application suivait les titres et les flux à venir, jamais l'argent
-- lui-même : un coupon tombé, un fonds racheté, un remboursement arrivé
-- repartaient vers la banque du client, et chaque ordre repartait de sa banque.
-- Tant qu'il en est ainsi, la plateforme est l'endroit où l'on passe des
-- ordres, pas celui où l'épargne se pose et se redéploie.
--
-- Cette table est la comptabilité de cet argent : ce qui est entré, ce qui est
-- sorti, ce qui reste dû à qui. Tenir ce compte n'est pas une activité
-- réglementée, c'est la condition de toutes les autres : sans lui la maison ne
-- sait pas ce qu'elle doit à chacun.
--
-- Ce qui est réglementé est autre chose, et la table le porte dans deux
-- colonnes. « intent_id » et « due_by » disent à quelle opération un franc est
-- destiné et jusqu'à quand. Un franc qui attend le règlement d'une opération
-- est du règlement, métier ordinaire d'une société de bourse. Un franc sans
-- destination ressemble à un dépôt, et la maison n'a pas d'agrément pour en
-- recevoir : il doit repartir. Le verrou vit dans le code (src/lib/domain/cash.ts,
-- politique fermée par défaut) ; la base, elle, enregistre toujours, y compris
-- les restitutions, parce qu'une comptabilité qui tait des mouvements ne vaut
-- rien.
create table if not exists client_cash (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  at          timestamptz not null default now(),
  -- toujours positif : le sens vient de « kind »
  amount      numeric(18, 2) not null check (amount > 0),
  kind        text not null check (kind in ('provision', 'coupon', 'remboursement', 'produit_vente', 'souscription', 'frais', 'restitution')),
  label       text not null default '',
  -- l'affectation : sans elle, l'argent est inoccupé
  intent_id   uuid,
  due_by      date,
  created_by  text
);

create index if not exists client_cash_user on client_cash (user_id, at desc);
create index if not exists client_cash_intent on client_cash (intent_id) where intent_id is not null;

-- Un mouvement ne se corrige pas en le réécrivant : on en passe un autre en
-- sens inverse. Une comptabilité se lit dans son ordre, elle ne se retouche pas.
create or replace function client_cash_no_update() returns trigger language plpgsql as $$
begin
  raise exception 'client_cash : un mouvement ne se modifie pas ; passer un mouvement inverse';
end;
$$;

drop trigger if exists client_cash_immutable on client_cash;
create trigger client_cash_immutable before update or delete on client_cash
  for each row execute function client_cash_no_update();

alter table client_cash enable row level security;
-- atteinte par le rôle de service seulement (les actions serveur du desk et de
-- Mon espace) ; aucun accès direct depuis le navigateur.
