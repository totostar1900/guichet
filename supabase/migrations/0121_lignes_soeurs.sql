-- ═══════════════════════════════════════════════════════════════════════════
-- LES SŒURS D'UNE MÊME PROPOSITION
--
-- Le client peut désormais proposer sa ligne à PLUSIEURS Trésors et sur
-- PLUSIEURS durées d'un seul geste. Ce geste ne produit pas une ligne mais
-- plusieurs, et elles ne s'additionnent pas : ce sont des ALTERNATIVES. Un
-- client qui dit « cinquante millions, sur du camerounais ou du gabonais, à
-- deux, cinq ou sept ans » propose six lignes pour cinquante millions, pas
-- trois cents.
--
-- SANS CE LIEN, LE CONSENSUS PROMETTRAIT SIX FOIS LE MÊME ARGENT. Le danger
-- n'est pas le seuil de maturité — il exige cent millions ET trois clients,
-- donc aucune des six ne le franchit seule. Le danger est qu'il ne déclenche
-- RIEN : le desk peut porter cinquante millions au Cameroun et cinquante
-- millions au Gabon, et le client n'en honorera qu'un. La maison aurait promis
-- deux fois le même argent à deux Trésors.
--
-- Voir « DOCTRINE_UNE_SEULE_FOIS » dans src/lib/domain/sondage.ts, qui porte la
-- règle, et « Consensus.ferme », qui la fait compter.
-- ═══════════════════════════════════════════════════════════════════════════

alter table survey_lines
  add column if not exists famille_id uuid;

comment on column survey_lines.famille_id is
  'L''identifiant partagé par les lignes nées d''un seul geste : elles sont des alternatives, pas des additions. Vide sur une ligne proposée seule, dont le montant est donc ferme.';

-- LE DESK NE PROPOSE PAS D'ALTERNATIVES. Il pose une question et la clôt ; une
-- famille sur une ligne du desk n'aurait aucun sens et fausserait la part ferme
-- de tout le groupe qui lui répond.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'survey_lines_famille_du_client') then
    alter table survey_lines
      add constraint survey_lines_famille_du_client check (famille_id is null or origine = 'client');
  end if;
end
$$;

-- La fermeté se mesure en comptant les sœurs VIVANTES d'une famille : c'est la
-- lecture que fait le consensus à chaque affichage du desk.
create index if not exists survey_lines_famille_idx
  on survey_lines (famille_id)
  where famille_id is not null;
