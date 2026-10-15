/**
 * LE RATIO COURS SUR BÉNÉFICE, ENFIN CALCULABLE.
 *
 * La colonne du bénéfice par action du bulletin officiel est vide sur les
 * 4 995 lignes d'actions. Le résultat net n'existait nulle part chez nous
 * avant que les quarante-huit états financiers des émetteurs ne soient lus,
 * le 15 octobre 2026.
 *
 * QUATRE RÈGLES, ET CHACUNE A SON PIÈGE MESURÉ.
 *
 *   UN RÉSULTAT DE SIX MOIS N'EST PAS UN RÉSULTAT D'EXERCICE. La Régionale
 *   dépose un semestriel 2024 à 0,10 milliard quand son exercice 2023 en fait
 *   0,81 : lus ensemble, son P/E passait de 48 à 240.
 *
 *   DEUX RÉFÉRENTIELS, DEUX RÉSULTATS. SOCAP 2023 vaut 11,93 milliards en
 *   OHADA et 12,94 en IFRS. On en choisit un, on le dit, et on montre l'autre
 *   à côté : les mélanger sur une même cote ferait un agrégat sans nom.
 *
 *   L'EXERCICE N'EST PAS LE MÊME POUR TOUS. Au 15 octobre 2026, BHC a déposé
 *   2025 et SOCAP s'arrête à 2023. Un P/E d'ensemble est donc une somme de
 *   millésimes, et la page affiche lesquels plutôt que de laisser croire à
 *   une photo du même jour.
 *
 *   UNE PERTE NE FAIT PAS UN P/E. Un ratio négatif n'a pas de sens
 *   économique : la valeur sort du calcul d'ensemble et se signale.
 */

export interface ComptesLus {
  mnemo: string;
  exercice?: number;
  referentiel: string;
  periode?: string;
  resultatNet?: number;
  capitauxPropres?: number;
  chiffreAffaires?: number;
}

export interface PoidsCote {
  mnemo: string;
  close: number;
  capTotal: number;
}

export type Cadre = "OHADA" | "IFRS";

export interface CoursSurBenefice {
  mnemo: string;
  /** L'exercice retenu, qui n'est pas le même pour tous. */
  exercice?: number;
  referentiel?: string;
  resultatNet?: number;
  capitalisation: number;
  /** La capitalisation sur le résultat net. Absent sur une perte. */
  pe?: number;
  /** Le résultat net sur les capitaux propres, en pour cent. */
  rendementDesFondsPropres?: number;
  /** La croissance du résultat d'un exercice au précédent, en pour cent. */
  croissance?: number;
  /** Ce qui empêche de conclure. */
  reserve?: string;
}

/**
 * LES COMPTES RETENUS POUR UNE VALEUR : le dernier exercice ANNUEL, dans le
 * référentiel demandé, et à défaut dans l'autre.
 *
 * Le repli n'est pas une commodité : sur sept émetteurs, trois ne déposent
 * qu'en OHADA et un seul en plan bancaire CEMAC. Exiger un référentiel unique
 * viderait la table de moitié.
 */
export function comptesRetenus(comptes: ComptesLus[], mnemo: string, cadre: Cadre): { retenu?: ComptesLus; precedent?: ComptesLus; replie: boolean } {
  const siens = comptes
    .filter((c) => c.mnemo === mnemo && c.periode !== "semestriel" && c.exercice != null && c.resultatNet != null)
    .sort((a, b) => (b.exercice ?? 0) - (a.exercice ?? 0));
  /**
   * LA FRAÎCHEUR PRIME SUR LE RÉFÉRENTIEL, et le tri l'avait inversé.
   *
   * Préférer le cadre demandé retenait l'exercice 2021 de La Régionale quand
   * son 2024 existe : un chiffre de trois ans, et silencieusement. Le
   * référentiel ne départage donc que DEUX DÉPÔTS DU MÊME EXERCICE, ce qui
   * est le cas où il a un sens : SOCAP 2023 vaut 11,93 en OHADA et 12,94 en
   * IFRS, et il faut bien en choisir un.
   */
  /* LE VIDE SE TESTE AVANT DE LIRE : une valeur sans comptes n est pas une
     erreur, c est le cas courant au debut d une campagne. */
  if (!siens.length) return { replie: false };
  const dernier = siens[0].exercice;
  const duMillesime = siens.filter((c) => c.exercice === dernier);
  const retenu = duMillesime.find((c) => c.referentiel === cadre) ?? duMillesime[0];
  const liste = siens;
  /* L'exercice précédent, dans le MÊME référentiel que le retenu : comparer
     un OHADA à un IFRS ferait passer un écart de méthode pour une croissance. */
  const precedent = liste.find((c) => c.referentiel === retenu.referentiel && (c.exercice ?? 0) === (retenu.exercice ?? 0) - 1);
  return { retenu, precedent, replie: retenu.referentiel !== cadre };
}

export function coursSurBenefice(comptes: ComptesLus[], poids: PoidsCote[], cadre: Cadre = "OHADA"): CoursSurBenefice[] {
  return poids
    .map((p) => {
      const { retenu, precedent, replie } = comptesRetenus(comptes, p.mnemo, cadre);
      if (!retenu || retenu.resultatNet == null) return { mnemo: p.mnemo, capitalisation: p.capTotal, reserve: "aucun exercice annuel lu" };
      const rn = retenu.resultatNet;
      const out: CoursSurBenefice = {
        mnemo: p.mnemo,
        exercice: retenu.exercice,
        referentiel: retenu.referentiel,
        resultatNet: rn,
        capitalisation: p.capTotal,
        pe: rn > 0 ? p.capTotal / rn : undefined,
        rendementDesFondsPropres: retenu.capitauxPropres ? (100 * rn) / retenu.capitauxPropres : undefined,
        croissance: precedent?.resultatNet ? (100 * (rn - precedent.resultatNet)) / Math.abs(precedent.resultatNet) : undefined,
      };
      if (rn <= 0) out.reserve = "exercice en perte : pas de ratio";
      else if (replie) out.reserve = `déposé en ${retenu.referentiel}, pas en ${cadre}`;
      return out;
    })
    .sort((a, b) => b.capitalisation - a.capitalisation);
}

export interface PeDEnsemble {
  /** La capitalisation des valeurs dont le résultat est connu et positif. */
  capitalisation: number;
  resultatNet: number;
  pe?: number;
  /** Combien de valeurs entrent dans ce ratio, sur combien de cotées. */
  comptees: number;
  total: number;
  /** Les exercices additionnés, du plus ancien au plus récent. */
  exercices: number[];
  /** Les valeurs écartées et pourquoi. */
  ecartees: { mnemo: string; motif: string }[];
}

/**
 * LE P/E DE LA COTE, QUI EST UNE SOMME ET NON UNE MOYENNE.
 *
 * On additionne les capitalisations et les résultats, puis on divise : c'est
 * la façon dont un indice se lit comme une seule entreprise. Une moyenne des
 * ratios donnerait le même poids à une société de dix milliards et à une de
 * mille trois cents.
 */
export function peDEnsemble(lignes: CoursSurBenefice[]): PeDEnsemble {
  const retenues = lignes.filter((l) => l.pe != null && l.resultatNet != null && l.resultatNet > 0);
  const capitalisation = retenues.reduce((s, l) => s + l.capitalisation, 0);
  const resultatNet = retenues.reduce((s, l) => s + (l.resultatNet ?? 0), 0);
  return {
    capitalisation,
    resultatNet,
    pe: resultatNet > 0 ? capitalisation / resultatNet : undefined,
    comptees: retenues.length,
    total: lignes.length,
    exercices: [...new Set(retenues.map((l) => l.exercice).filter((x): x is number => x != null))].sort(),
    ecartees: lignes.filter((l) => l.pe == null).map((l) => ({ mnemo: l.mnemo, motif: l.reserve ?? "résultat inconnu" })),
  };
}
