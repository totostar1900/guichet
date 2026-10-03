-- Chaque tour d'un robot laisse une ligne, même quand il n'a rien fait.
--
-- Les robots n'écrivaient au journal que lorsqu'ils agissaient. Un tour qui ne
-- trouve rien à faire ne laissait donc aucune trace, et c'est la panne la plus
-- confortable : un robot quotidien peut être mort depuis une semaine sans que
-- personne le sache, puisque son silence ressemble exactement à son silence
-- ordinaire.
--
-- Mesuré le 3 octobre 2026 : pour dire si le robot de l'épargne avait tourné le
-- matin même, il a fallu prouver que l'ordonnanceur marchait par un AUTRE robot,
-- celui qui envoie la synthèse. Le robot interrogé, lui, n'avait rien à dire.
--
-- UNE LIGNE PAR TOUR, ET NON DANS LE FIL DU DESK. Douze robots fois une ligne
-- par jour noieraient le fil des événements, qui est fait pour être lu. Ceci est
-- un registre de machine : il se consulte quand on se demande si quelque chose
-- tourne, et c'est la page Santé qui le regarde à notre place.
--
-- CE QUI COMPTE EST L'ABSENCE, pas la présence. Une ligne qui existe ne dit
-- rien d'intéressant ; une ligne qui manque depuis plus longtemps que la cadence
-- du robot est le signal. La cadence vit en code, à côté de la liste de
-- `vercel.json`, et un cliquet interdit aux deux de diverger.

create table if not exists cron_runs (
  id          uuid primary key default gen_random_uuid(),
  -- La clef du robot : le dernier segment de son chemin, « epargne », « coupons ».
  robot       text not null,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  -- Faux quand le tour a levé : le robot a bien tourné, et il a échoué. Les deux
  -- se distinguent, parce qu'ils ne se réparent pas pareil.
  ok          boolean,
  -- Ce que le tour a rendu : les compteurs du robot, tels quels.
  detail      jsonb,
  error       text
);

create index if not exists cron_runs_robot on cron_runs (robot, started_at desc);

comment on table cron_runs is
  'Un tour de robot, même vide. Ce qui compte est l''absence de ligne, pas sa présence : un robot muet ressemble à un robot mort.';

alter table cron_runs enable row level security;
-- atteinte par le rôle de service seulement : les robots l'écrivent, la page
-- Santé la lit.
