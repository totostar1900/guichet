-- LA DISCIPLINE D'UNE NOTE, PORTEE AUSSI PAR LA BASE.
--
-- `verifierNote` (src/lib/market/note-budget.ts) tient ces regles devant le
-- formulaire et dans l'action serveur. Elles sont ici une seconde fois, et
-- c'est voulu : une regle qui n'existe qu'en TypeScript se contourne par un
-- script, un import, une console. La maison a deja ecrit cette phrase pour les
-- jugements de bulletins, ou la page exigee par certains motifs est gardee des
-- deux cotes.
--
-- CE QUI EST GARDE ICI EST CE QUI NE DEPEND PAS DE LA LANGUE : des longueurs,
-- et la presence des deux genres. Le conditionnel d'une lecture reste au
-- TypeScript — une expression reguliere francaise dans un « check » serait un
-- piege pour qui ajoutera l'anglais, et un refus de base illisible pour qui le
-- rencontrerait.
alter table public.notes_budget
  -- « Rien a corriger » fait quarante signes ; vingt est un plancher, pas une exigence.
  add constraint notes_budget_mal_lu_ecrit check (length(btrim(mal_lu)) >= 20),
  -- Une note se demande : sans motif ni demandeur, la serie devient un calendrier.
  add constraint notes_budget_motif_ecrit check (length(btrim(motif)) >= 8),
  add constraint notes_budget_demandee_par_ecrit check (length(btrim(demandee_par)) >= 2),
  add constraint notes_budget_en_une_phrase_ecrite check (length(btrim(en_une_phrase)) >= 40),
  add constraint notes_budget_titre_ecrit check (length(btrim(titre)) >= 8),
  -- UN CONSTAT ET UNE LECTURE, LES DEUX. Sans constat la note n'a rien lu ;
  -- sans lecture elle n'engage personne, et n'avait pas lieu d'etre demandee.
  add constraint notes_budget_corps_porte_les_deux check (
    jsonb_path_exists(corps, '$[*] ? (@.genre == "constat")')
    and jsonb_path_exists(corps, '$[*] ? (@.genre == "lecture")')
  ),
  -- Le releve est pris sur la fiche : vide, le tableau des ecarts de la note
  -- suivante n'aurait rien a comparer et se tairait au lieu de le dire.
  add constraint notes_budget_releve_non_vide check (jsonb_array_length(releve) > 0);
