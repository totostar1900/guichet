-- ═══════════════════════════════════════════════════════════════════════════
-- LA FENÊTRE D'UNE ATTENTE : UN DÉBUT, ET MAINTENANT UNE FIN
--
-- Une ligne sondée disait À PARTIR DE QUAND son auteur serait prêt — « seance_le »
-- ou « dans_jours », l'un des deux — et jamais JUSQU'À QUAND il le resterait.
-- Elle ne s'éteignait donc pas : le desk portait au Trésor des appétits vieux de
-- trois mois, que le client avait peut-être placés ailleurs, et la seule sortie
-- était le bouton « Retirer », qu'il fallait penser à venir presser.
--
-- CE QUE « JUSQU_A » CHANGE, ET RIEN DE PLUS : passé ce jour, la ligne cesse de
-- compter dans le consensus. Elle n'est pas close — le desk la voit encore, avec
-- son mot — mais elle ne grossit plus une demande qu'on porte. Vide, l'attente
-- tient jusqu'à ce que son auteur la retire, exactement comme avant : les lignes
-- déjà en base ne changent pas de sens.
--
-- Voir « expiree » et « consensus » dans src/lib/domain/sondage.ts.
-- ═══════════════════════════════════════════════════════════════════════════

alter table survey_lines
  add column if not exists jusqu_a date;

comment on column survey_lines.jusqu_a is
  'Jusqu''à quand cette attente tient. Passé ce jour elle ne compte plus dans le consensus. Vide : elle tient jusqu''au retrait de son auteur.';

-- UNE FENÊTRE QUI SE FERME AVANT DE S'OUVRIR N'EN EST PAS UNE. Le formulaire le
-- refuse déjà avec ses mots ; la base le refuse pour tout le monde, y compris
-- pour une reprise de données qui ne passerait pas par lui.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'survey_lines_fenetre_ordonnee') then
    alter table survey_lines
      add constraint survey_lines_fenetre_ordonnee check (jusqu_a is null or seance_le is null or jusqu_a >= seance_le);
  end if;
end
$$;

-- Le consensus lit les lignes vivantes et écarte celles dont la fenêtre est
-- fermée : c'est la lecture faite à chaque affichage du desk.
create index if not exists survey_lines_jusqu_a_idx
  on survey_lines (jusqu_a)
  where jusqu_a is not null;
