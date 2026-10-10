/**
 * POURQUOI UNE PIÈCE D'ENTRÉE EST REJETÉE.
 *
 * « Rejeter » était la seule décision du desk qui n'enregistrait AUCUN motif :
 * refuser une approbation, renvoyer un brouillon en correction, annuler un
 * ordre, écarter une séance, refuser un versement, tous demandent une note et
 * la gardent. Une pièce rejetée, elle, changeait d'état en silence. Audité le
 * 26 septembre 2026 avec les deux trous des quatre yeux, réparé le 10 octobre.
 *
 * LE MOTIF EST UNE CAUSE NOMMÉE, PAS UNE PHRASE LIBRE, pour la même raison
 * qu'un rejet de prélèvement (voir domain/prelevement) : c'est la cause qui
 * décide de la suite, et une phrase libre ne se compte pas. La précision
 * libre existe à côté, et elle est obligatoire quand la cause est « autre » :
 * sans quoi « autre » deviendrait le bouton de ceux qui sont pressés.
 *
 * La liste est courte à dessein. Une liste exhaustive serait une liste fausse,
 * et c'est le même raisonnement que pour les codes de rejet des banques.
 */
export type CauseDeRejet = "hors_sujet" | "doublon" | "perimee" | "illisible" | "retiree" | "autre";

export interface MotifDeRejetSource {
  libelle: string;
  /** Ce qui suit, dit au desk : un rejet n'est pas toujours une fin. */
  suite: string;
  /** « Autre » n'explique rien tout seul. */
  precisionRequise?: boolean;
}

export const CAUSES_DE_REJET: Record<CauseDeRejet, MotifDeRejetSource> = {
  hors_sujet: { libelle: "Ce n'est pas une offre", suite: "Rien à publier : accusé de réception, lettre d'information, message sans pièce." },
  doublon: { libelle: "Déjà traitée", suite: "La pièce d'origine reste la référence ; celle-ci ne crée pas de seconde version." },
  perimee: { libelle: "Échéance passée", suite: "L'opération est close avant d'avoir été publiée : rien ne part aux clients." },
  illisible: { libelle: "Pièce illisible ou incomplète", suite: "Redemander la source à l'émetteur, puis déposer la nouvelle pièce." },
  retiree: { libelle: "Retirée par l'émetteur", suite: "L'émetteur a annulé son opération : garder la trace, ne rien publier." },
  autre: { libelle: "Autre", suite: "Dites-le en une phrase : c'est ce qui restera au journal.", precisionRequise: true },
};

export const estUneCauseDeRejet = (v: string): v is CauseDeRejet => v in CAUSES_DE_REJET;

/** La phrase gardée au dossier : la cause, puis la précision quand il y en a une. */
export function phraseDuRejet(cause: CauseDeRejet, precision?: string): string {
  const p = precision?.trim();
  return p ? `${CAUSES_DE_REJET[cause].libelle} · ${p}` : CAUSES_DE_REJET[cause].libelle;
}
