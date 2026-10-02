-- La preuve d'un encaissement, et l'écart avec ce qui était dû.
--
-- Le journal portait le montant, la nature, le libellé, l'opération affectée,
-- la clef de l'échéance et le nom de l'opérateur. Aucune colonne ne portait une
-- preuve. Et l'écran devant l'opérateur était l'échéancier lui-même : le
-- produit l'invitait à confirmer sur la foi de ce qu'il avait prédit. Le
-- mouvement s'inscrivait pour le montant ATTENDU, daté de l'ÉCHÉANCE et non du
-- crédit.
--
-- Le mode de défaillance qui en découlait ne se signalait pas. L'émetteur paie
-- en retard, partiellement, ou pas du tout ; l'opérateur confirme ; le robot
-- replace ; l'avis part. Tout a l'air juste, et rien n'est arrivé.
--
-- Trois colonnes y répondent, et la première est la seule qui compte vraiment :
--
--   evidence  la pièce. Une ligne de relevé, un numéro d'avis du teneur de
--             compte. C'est ce qu'un contrôleur demandera en premier, et c'est
--             ce qui distingue un constat d'une présomption.
--   expected  ce que l'échéancier disait. Le garder rend l'écart DURABLE :
--             sans lui, un coupon payé 480 000 au lieu de 500 000 s'inscrit
--             pour 480 000 et plus rien ne dit qu'il manque 20 000.
--   at        existait déjà, et portait la date de l'échéance. Elle porte
--             désormais la date de valeur, celle du crédit. L'échéance reste
--             dans la clef et dans le libellé : rien ne se perd, et « encaissé
--             le » cesse de répéter « échu le ».
--
-- LA CONTRAINTE EST POSÉE « NOT VALID », à dessein. Un mouvement qui encaisse
-- une échéance doit porter sa pièce, mais les mouvements déjà inscrits ont été
-- faits sous l'ancienne règle et les réécrire serait les falsifier : la table
-- interdit d'ailleurs toute modification. La contrainte vaut donc pour ce qui
-- vient, et l'ancien reste lisible pour ce qu'il est.

alter table client_cash add column if not exists evidence text;
alter table client_cash add column if not exists expected numeric(18, 2);

comment on column client_cash.evidence is
  'La pièce qui atteste ce mouvement : ligne de relevé, numéro d''avis du teneur de compte. Obligatoire dès qu''un mouvement encaisse une échéance.';
comment on column client_cash.expected is
  'Ce que l''échéancier annonçait, quand ce mouvement solde une échéance. L''écart avec « amount » est ce qui appelle quelqu''un.';
comment on column client_cash.at is
  'La date de valeur : le jour où l''argent est arrivé. Ce n''est pas la date d''échéance, qui vit dans flow_key et dans le libellé.';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'client_cash_flux_avec_piece') then
    alter table client_cash
      add constraint client_cash_flux_avec_piece
      check (flow_key is null or (evidence is not null and length(btrim(evidence)) >= 3))
      not valid;
  end if;
end $$;

-- La file de travail : ce qui a été reçu pour autre chose que ce qui était dû.
create index if not exists client_cash_ecart on client_cash (user_id, at desc)
  where expected is not null and expected <> amount;
