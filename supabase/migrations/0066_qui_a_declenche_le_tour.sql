alter table cron_runs add column if not exists par text;

comment on column cron_runs.par is
  'Qui a déclenché le tour : « cron » pour l''ordonnanceur, « main » pour un humain. Seul un tour de l''ordonnanceur prouve que l''ordonnanceur vit, et c''est tout ce que ce registre sert à voir.';
