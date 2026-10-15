-- UN RESULTAT DE SIX MOIS N EST PAS UN RESULTAT D EXERCICE.
--
-- Le prendre pour tel divise le benefice par deux et double le ratio cours sur
-- benefice. La Regionale depose un semestriel 2024 a 0,10 milliard quand son
-- exercice 2023 en fait 0,81 : lus cote a cote sans distinction, son P/E
-- passait de 48 a 240 sans que rien ne le signale.
--
-- La periode se deduit du genre du document, qui est deja connu : elle est
-- posee ici plutot que relue, parce qu une lecture de modele pour une
-- information que la table porte deja serait une depense pour rien.
alter table public.issuer_financials add column if not exists periode text;

update public.issuer_financials f
set periode = case when d.kind = 'rapport_semestriel' then 'semestriel' else 'annuel' end
from public.issuer_documents d
where d.id = f.document_id and f.periode is null;
