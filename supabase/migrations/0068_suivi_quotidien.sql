-- Deux cadences de suivi, parce que deux marchés ne se suivent pas pareil.
--
-- Sur la cote, ce qui mérite un message est un CHANGEMENT : un cours qui bouge,
-- un statut qui change. Le robot compare chaque matin et n'écrit que si quelque
-- chose a bougé. Mesuré sur douze mois : zéro transaction au compartiment
-- obligataire, donc ces messages sont rares, et c'est voulu.
--
-- À l'adjudication, rien ne bouge jusqu'à la séance, et c'est justement la
-- séance qu'il ne faut pas manquer : une annonce tombe une semaine avant, le
-- dépôt ferme à une heure précise, et après il n'y a plus rien à faire. Le
-- message utile n'est donc pas « ça a changé » mais « il vous reste n jours ».
--
-- Le mode s'arrête de lui-même : passée la clôture, un suivi quotidien n'a plus
-- d'objet et le robot ne lui écrit plus.
alter table watchlist add column if not exists mode text not null default 'evenement';

alter table watchlist drop constraint if exists watchlist_mode_check;
alter table watchlist add constraint watchlist_mode_check check (mode in ('evenement', 'quotidien'));

comment on column watchlist.mode is
  'evenement : un message quand le chiffre ou l''état bouge (la cote). quotidien : un message par jour jusqu''à la clôture (une adjudication).';

-- Le jour du dernier message quotidien, pour n'en envoyer qu'un par jour même
-- si le robot passe deux fois.
alter table watchlist add column if not exists last_daily date;
