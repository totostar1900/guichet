-- Le rapprochement : ce que la maison doit à ses clients, face à ce qu'elle tient.
--
-- La règle des espèces s'est ouverte le 2 octobre 2026 : l'argent qui se trouve
-- sur les comptes de la maison appartient au client et peut y rester aussi
-- longtemps qu'il le souhaite. Cette phrase crée une obligation de contrôle que
-- l'ancienne règle évitait en ne gardant rien.
--
-- L'APPLICATION NE CONNAÎT QU'UN CÔTÉ. Le journal des espèces dit, franc par
-- franc, ce que la maison doit à chacun : c'est le seul endroit qui le dise, et
-- c'est pour cela que la ségrégation repose sur lui. Mais rien ici ne lit le
-- solde des comptes de la maison à la BEAC, à la BVMAC ou en banque. L'autre
-- côté se DÉCLARE, contre sa pièce, comme l'encaissement d'un coupon.
--
-- POURQUOI LES DEUX CHIFFRES SONT GELÉS ICI, alors que la maison ne stocke pas
-- les chiffres calculés. Le rapport de performance se recalcule à chaque
-- lecture, et c'est juste : il répond « où en suis-je aujourd'hui ». Un
-- rapprochement répond autre chose : « le 3 octobre, nous avons comparé CECI à
-- CELA ». Recalculer le dû à chaque lecture ferait dériver le passé, et un
-- rapprochement qui tombait juste montrerait un écart six mois plus tard, parce
-- qu'un coupon a été constaté entre-temps. Un contrôle est une affirmation
-- datée, pas une vue.
--
-- L'ÉCART N'EST PAS SYMÉTRIQUE, et c'est ce que l'écran doit dire.
--
--   Tenir PLUS que ce qu'on doit est ordinaire : l'argent propre de la maison
--   est sur les mêmes comptes, et un virement peut être en route.
--
--   Tenir MOINS que ce qu'on doit à ses clients est la seule chose grave que ce
--   contrôle existe pour voir.

create table if not exists cash_reconciliations (
  id          uuid primary key default gen_random_uuid(),
  -- La date du rapprochement : celle des relevés comparés, pas celle de la saisie.
  on_date     date not null,
  -- Le dû, gelé : somme des journaux de tous les clients au moment du contrôle.
  owed        numeric(18, 2) not null,
  -- Sa part affectée au règlement d'un ordre vivant ; le reste est réclamable.
  owed_assigned numeric(18, 2) not null default 0,
  -- Le tenu, déclaré : somme des lignes ci-dessous.
  held        numeric(18, 2) not null,
  -- Une ligne par compte : { label, balance, evidence }. Elles ne se consultent
  -- jamais seules, donc elles vivent avec leur rapprochement.
  accounts    jsonb not null default '[]'::jsonb,
  -- Obligatoire dès qu'il y a un écart : un écart sans explication n'est pas un
  -- contrôle, c'est un constat d'ignorance. L'action le redemande.
  note        text,
  created_at  timestamptz not null default now(),
  created_by  text not null
);

create index if not exists cash_reconciliations_date on cash_reconciliations (on_date desc);

comment on column cash_reconciliations.owed is
  'Le dû au moment du contrôle, gelé. Le recalculer ferait dériver le passé : un contrôle est une affirmation datée, pas une vue.';
comment on column cash_reconciliations.held is
  'Le solde déclaré des comptes de la maison. L''application ne le lit pas : un opérateur le saisit contre ses relevés.';

-- Un contrôle ne se retouche pas : on en fait un autre. Même raison que le
-- journal des espèces, et c'est encore plus vrai ici, puisque la valeur d'un
-- rapprochement tient entièrement à ce qu'il n'a pas été réécrit après coup.
create or replace function cash_reconciliations_no_update() returns trigger language plpgsql as $$
begin
  raise exception 'cash_reconciliations : un rapprochement ne se modifie pas ; en faire un autre';
end;
$$;

drop trigger if exists cash_reconciliations_immutable on cash_reconciliations;
create trigger cash_reconciliations_immutable before update or delete on cash_reconciliations
  for each row execute function cash_reconciliations_no_update();

alter table cash_reconciliations enable row level security;
-- atteinte par le rôle de service seulement : le desk la nourrit, personne ne la lit du navigateur.
