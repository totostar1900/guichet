-- Le client témoigne de son propre encaissement.
--
-- Deux populations, et une seule a un témoin. Pour un client dont la maison a
-- ouvert le sous-compte, le teneur de compte adresse l'avis de paiement et la
-- maison voit le coupon tomber. Pour un client dont le compte-titres est tenu
-- ailleurs, la maison ne voit rien : l'argent ne passe pas par elle, et le
-- client est la seule personne au monde qui sache si l'émetteur a payé.
--
-- L'écran lui disait pourtant « l'émetteur doit encore ces sommes, et le desk
-- les suit », sans aucun bouton, avec ce commentaire dans le code : « il n'y a
-- rien à replacer tant que rien n'est arrivé ». C'était vrai et c'était
-- incomplet : il n'y avait rien à REPLACER, mais il y avait quelque chose à
-- DIRE, et la seule personne qui pouvait le dire n'était pas consultée.
--
-- UNE DÉCLARATION N'EST PAS UN MOUVEMENT, et c'est pourquoi cette table se
-- modifie alors que `client_cash` l'interdit. Une écriture comptable est un
-- fait posé : on ne la réécrit pas, on en passe une autre en sens inverse. Une
-- déclaration est un témoignage sur le monde : quelqu'un qui relit son relevé
-- et découvre que le virement était bien là doit pouvoir se corriger, sans
-- qu'on lui demande de « passer une déclaration inverse », ce qui n'aurait
-- aucun sens. Une seule déclaration vivante par échéance, donc, et elle se
-- remplace.
--
-- ELLE NE CRÉDITE RIEN. Un client qui dit « reçu » ne fait pas entrer d'argent
-- au journal : il donne au desk une raison d'aller chercher la pièce. Le
-- constat reste un geste de la maison, contre un relevé, parce que c'est elle
-- qui l'atteste ensuite par un avis numéroté.

create table if not exists flow_reports (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  -- L'échéance dont il est question : la même clef que le journal des espèces.
  flow_key   text not null,
  -- « recu » : l'argent est sur mon compte. « rien » : rien n'est arrivé.
  -- « autre » : une somme est arrivée, mais pas celle-là.
  said       text not null check (said in ('recu', 'rien', 'autre')),
  -- Le montant réellement vu, quand il diffère : c'est la raison d'être de « autre ».
  said_amount numeric(18, 2),
  -- Le jour où le client l'a vu sur son compte.
  said_on    date,
  note       text,
  at         timestamptz not null default now(),
  constraint flow_reports_autre_chiffre check (said <> 'autre' or (said_amount is not null and said_amount > 0))
);

-- Une seule déclaration vivante par échéance : la nouvelle remplace l'ancienne.
create unique index if not exists flow_reports_une_par_flux on flow_reports (user_id, flow_key);
create index if not exists flow_reports_file on flow_reports (said, at desc);

comment on table flow_reports is
  'Le témoignage du client sur une échéance. Il ne crédite rien : il donne au desk une raison d''aller chercher la pièce.';
comment on column flow_reports.said is
  'recu | rien | autre. « rien » après plusieurs jours est le signal que l''émetteur n''a pas payé, et c''est une créance à poursuivre.';

alter table flow_reports enable row level security;
-- atteinte par le rôle de service seulement : la déclaration passe par une
-- action serveur, qui connaît le client par sa session.
