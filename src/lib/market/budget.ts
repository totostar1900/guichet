import type { BudgetEtat, Country, EtatDuMillesime, NoteBudget, PorteDeFinancement } from "@/lib/domain/types";

/**
 * CE QUE LA PAGE DES BUDGETS CALCULE, ET CE QU'ELLE REFUSE DE CALCULER.
 *
 * Trois règles tiennent ce fichier, et elles viennent toutes du même endroit :
 * un chiffre faux d'une précision rassurante vaut moins que pas de chiffre.
 *
 *  1. LE SOLDE NE SE RECALCULE JAMAIS. Les documents donnent leur solde ; nos
 *     deux agrégats n'en ont pas le périmètre. Pour le Cameroun 2026, la
 *     soustraction donne −323,5 et le document dit −631,0. On montre le sien.
 *  2. AUCUN TOTAL DE ZONE. Six millésimes différents, trois révisés, deux
 *     inconnus : les additionner donnerait un chiffre sans date. C'est le même
 *     refus que « Dette des États », qui montre deux colonnes et pas un total.
 *  3. AUCUNE PRÉVISION D'ÉMISSION. Le programme est une déclaration, l'adjugé
 *     un fait. On montre les deux et on n'invente pas un troisième chiffre.
 */

/**
 * LE MOT DU MILLÉSIME, EN UN SEUL ENDROIT.
 *
 * La liste le peint, la fiche le nomme, et le relevé d'une note l'enregistre :
 * trois lecteurs pour une même donnée. Le TON — la couleur du jeton — reste à
 * la page, parce qu'il parle de l'écran et non du budget.
 */
export const MOT_DU_MILLESIME: Record<EtatDuMillesime, string> = {
  vote: "voté",
  revision_annoncee: "révision annoncée",
  revision_deposee: "révision déposée",
  revise: "révisé",
};

/**
 * LES TROUS D'UN GABARIT, PRÊTS POUR L'ÉCRAN.
 *
 * Le domaine range une date telle qu'elle s'écrit — « 2026-08-03 » —, parce
 * qu'une date formatée ne se compare plus et ne se trie plus. L'écran la met
 * au format de la maison, et le formateur lui est passé : le domaine ne
 * connaît ni la langue ni le fuseau de qui lit.
 *
 * LA RÈGLE PORTE SUR LA FORME ET NON SUR LE NOM DU TROU. Une première version
 * ne formatait que le trou nommé « releve » ; les motifs du refus de
 * « leve.ts » en ont ajouté deux autres, et ils sont sortis en brut à l'écran.
 * Un correctif par nom de champ se refait à chaque nouveau champ.
 */
const UNE_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const trousDe = (params: Record<string, string>, fmtDate: (d: string) => string): Record<string, string> =>
  Object.fromEntries(Object.entries(params).map(([k, v]) => [k, UNE_DATE.test(v) ? fmtDate(v) : v]));

/** Les montants sont stockés en millions ; la loi et la presse parlent en milliards. */
export const enMilliards = (millions: number | undefined): string =>
  millions === undefined ? "—" : (millions / 1000).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Le besoin de financement, moins le déficit : ce que l'État rend sur ses emprunts passés. */
export const amortissementImplicite = (b: BudgetEtat): number | undefined =>
  b.besoinDeFinancement === undefined || b.soldeDeclare === undefined ? undefined : b.besoinDeFinancement - Math.abs(b.soldeDeclare);

/**
 * LE RAPPORT QUI PORTE LA PAGE : le besoin rapporté au déficit.
 *
 * Cameroun 2026 : 3 104,2 pour 631,0, soit près de cinq fois. Qui raisonne
 * « déficit donc émissions » se trompe de 80 %.
 */
export const foisLeDeficit = (b: BudgetEtat): number | undefined =>
  b.besoinDeFinancement === undefined || !b.soldeDeclare ? undefined : b.besoinDeFinancement / Math.abs(b.soldeDeclare);

/** La porte des titres publics : la seule que Guichet voit. */
export const porteDesTitres = (b: BudgetEtat): PorteDeFinancement | undefined => b.financement.find((f) => f.titres);

/**
 * LA PART DU BESOIN QUI PASSE PAR LES TITRES — et pourquoi elle se montre
 * à côté des cinq autres portes et jamais seule. Ce n'est pas une décision,
 * c'est un SOLDE : quand un appui glisse ou qu'un prêt projet ne se tire pas,
 * c'est elle qui enfle, en cours d'année, sans qu'aucune loi soit rouverte.
 */
export const partDesTitres = (b: BudgetEtat): number | undefined => {
  const t = porteDesTitres(b);
  if (!t || !b.besoinDeFinancement) return undefined;
  return t.montant / b.besoinDeFinancement;
};

export const sommeDes = (postes: { montant: number }[]): number => postes.reduce((s, p) => s + p.montant, 0);

/**
 * LE PLAN DE FINANCEMENT BOUCLE-T-IL ? La question vaut d'être posée à
 * l'écran : pour le Cameroun les six portes donnent 3 104,2 au centime, et
 * c'est ce qui dit que le tableau est le vrai et non une reconstitution. Un
 * jour où il ne bouclera pas, la page doit le dire plutôt que l'arrondir.
 */
export const financementBoucle = (b: BudgetEtat): { somme: number; ecart: number } | undefined => {
  if (!b.financement.length || b.besoinDeFinancement === undefined) return undefined;
  const somme = sommeDes(b.financement);
  return { somme, ecart: somme - b.besoinDeFinancement };
};

/** Ce qu'il manque pour que la fiche se lise : nommé, jamais deviné. */
export const estComplet = (b: BudgetEtat): boolean => b.recettes.length > 0 && b.depenses.length > 0 && b.financement.length > 0 && b.besoinDeFinancement !== undefined;

/** L'ordre de lecture : les plus avancés d'abord, puis les plus gros besoins. */
export const parLisibilite = (budgets: BudgetEtat[]): BudgetEtat[] =>
  [...budgets].sort((a, b) => Number(estComplet(b)) - Number(estComplet(a)) || (b.besoinDeFinancement ?? 0) - (a.besoinDeFinancement ?? 0) || a.pays.localeCompare(b.pays));

export const notesDe = (notes: NoteBudget[], pays: Country, exercice: number): NoteBudget[] =>
  notes.filter((n) => n.pays === pays && n.exercice === exercice).sort((a, b) => b.numero - a.numero);

/**
 * L'ÉCART ENTRE DEUX NOTES SE CALCULE, IL NE SE RÉDIGE PAS.
 *
 * « Ce qui a changé » ne vaut que si le lecteur peut le vérifier. Chaque note
 * enregistre les chiffres qu'elle commente ; le tableau des écarts est produit
 * à partir d'eux, et la prose n'a plus qu'à l'expliquer. C'est la discipline du
 * journal d'audit de la maison : un avant, un après, la raison entre les deux.
 */
export type Ecart = { cle: string; libelle: string; avant?: string; apres?: string; change: boolean };

export const ecartsEntre = (precedente: NoteBudget | undefined, actuelle: NoteBudget): Ecart[] => {
  const avant = new Map((precedente?.releve ?? []).map((r) => [r.cle, r]));
  const vus = new Set<string>();
  const out: Ecart[] = [];
  for (const r of actuelle.releve) {
    vus.add(r.cle);
    const a = avant.get(r.cle);
    out.push({ cle: r.cle, libelle: r.libelle, avant: a?.valeur, apres: r.valeur, change: a?.valeur !== r.valeur });
  }
  /* Un chiffre que la note précédente portait et que celle-ci ne porte plus
     est un changement, lui aussi : la page ne doit pas le perdre en silence. */
  for (const [cle, r] of avant) if (!vus.has(cle)) out.push({ cle, libelle: r.libelle, avant: r.valeur, apres: undefined, change: true });
  return out;
};

/** Les six États de la zone, dans l'ordre où la maison les nomme. */
export const PAYS_CEMAC: Country[] = ["Cameroun", "Gabon", "Congo", "Tchad", "RCA", "Guinée éq."];

/** L'adresse d'un État dans l'URL : sans accent ni espace, et stable. */
export const slugDuPays = (p: Country): string =>
  ({ Cameroun: "cameroun", Gabon: "gabon", Congo: "congo", Tchad: "tchad", RCA: "rca", "Guinée éq.": "guinee-equatoriale" })[p];

export const paysDuSlug = (s: string): Country | undefined => PAYS_CEMAC.find((p) => slugDuPays(p) === s);
