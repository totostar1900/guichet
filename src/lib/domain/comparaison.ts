/**
 * COMPARER SUR UNE MÊME PÉRIODE (7 novembre 2026).
 *
 * Le comparatif mettait en face des chiffres de natures différentes : un OTA à cinq ans (une promesse à l'échéance), un fonds (douze mois de passé), une action (un dividende).
 * Ce module mesure, pour une période choisie, ce que chaque ligne a réellement rendu avec ce qu'on en sait, et dit « non mesurable » quand on ne le sait pas.
 *
 *   FONDS            la variation de la valeur liquidative sur la période.
 *   ACTION, OBLIGATION COTÉE   la variation du cours, dividendes et coupons non compris : le dividende réellement versé dans la période n'est pas connu de la base.
 *   BON DU TRÉSOR    un bon se tient jusqu'à son échéance. On suppose donc qu'on achète à chaque séance d'adjudication disponible au taux moyen pondéré, qu'on garde jusqu'à
 *                    l'échéance, puis qu'on réinvestit à la séance suivante. Le temps sans placement est valorisé au taux bancaire donné. Un placement qui n'est pas échu à la fin
 *                    de la période n'est pas fait : l'argent reste au taux bancaire.
 *   OTA              AUCUNE MESURE SUR UNE PÉRIODE. Le marché secondaire est peu liquide : on suppose qu'il n'y a pas de sortie anticipée, donc son rendement est son
 *                    rendement actuariel à l'échéance, étiqueté comme tel et jamais calculé sur une fenêtre.
 *
 * Brut, avant frais et fiscalité. Le passé ne préjuge pas de l'avenir : ce qui sort d'ici décrit ce qui s'est passé.
 */
import { daysBetween, facteurBancaire, prixDuBonEnPartDuNominal, rendementAnnualisePct, rendementCumulePct } from "../finance";

export interface Point {
  date: string; // YYYY-MM-DD
  valeur: number;
}

export interface Couverture {
  debut: string;
  fin: string;
}

export interface Mesure {
  cumule: number;
  /** Nul sous trente jours : on n'extrapole pas un mois à l'année. */
  annualise: number | null;
  jours: number;
}

export const ajouteJours = (iso: string, n: number): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Ce que deux lignes ont en commun : du plus tardif des débuts au plus précoce des fins. Rien en commun : indéfini. */
export function fenetreCommune(couvertures: Couverture[]): Couverture | undefined {
  if (!couvertures.length) return undefined;
  const debut = couvertures.map((c) => c.debut).sort().at(-1)!;
  const fin = couvertures.map((c) => c.fin).sort()[0];
  return debut <= fin ? { debut, fin } : undefined;
}

/** La plage demandée, ramenée dans ce qu'on a en commun. `borne` dit qu'elle a été réduite : la page doit le dire. */
export function borner(demande: { du?: string; au?: string }, commune: Couverture, joursParDefaut = 365): { du: string; au: string; borne: boolean } {
  const auDemande = demande.au ?? commune.fin;
  const au = auDemande > commune.fin ? commune.fin : auDemande < commune.debut ? commune.debut : auDemande;
  const duDemande = demande.du ?? ajouteJours(au, -joursParDefaut);
  const du = duDemande < commune.debut ? commune.debut : duDemande > au ? au : duDemande;
  return { du, au, borne: (demande.du != null && du !== demande.du) || (demande.au != null && au !== demande.au) };
}

/** La dernière valeur connue à une date, si elle n'est pas plus vieille que la tolérance (une VL mensuelle n'est pas celle d'hier). */
export function valeurAu(points: Point[], date: string, toleranceJours: number): number | undefined {
  let lo = 0;
  let hi = points.length - 1;
  let trouve = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].date <= date) {
      trouve = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  if (trouve < 0) return undefined;
  return daysBetween(points[trouve].date, date) <= toleranceJours ? points[trouve].valeur : undefined;
}

export const mesure = (debut: number, fin: number, jours: number): Mesure | undefined => {
  const cumule = rendementCumulePct(debut, fin);
  return cumule == null ? undefined : { cumule, annualise: rendementAnnualisePct(debut, fin, jours), jours };
};

/** Fonds, actions, obligations cotées : la variation entre deux dates, sur une série triée par date. */
export function mesureSurPoints(points: Point[], du: string, au: string, toleranceJours: number): Mesure | undefined {
  const a = valeurAu(points, du, toleranceJours);
  const b = valeurAu(points, au, toleranceJours);
  const jours = daysBetween(du, au);
  return a == null || b == null || jours <= 0 ? undefined : mesure(a, b, jours);
}

/** Une séance d'adjudication de bons : le taux moyen pondéré payé, sur une durée de 13, 26 ou 52 semaines. */
export interface SeanceBon {
  date: string;
  tauxPct: number;
  semaines: number;
}

export interface Roule extends Mesure {
  placements: number;
  joursSansPlacement: number;
}

/**
 * Un bon, tenu jusqu'à l'échéance, réinvesti à la séance suivante (ou une seule fois). Le règlement est supposé le jour de la séance.
 * Retourne undefined quand aucune séance de cette durée ne tombe dans la période : il n'y a rien à mesurer.
 */
export function bonRoule(seances: SeanceBon[], semaines: number, du: string, au: string, tauxBancairePct: number, uneFois = false): Roule | undefined {
  const jours = daysBetween(du, au);
  if (jours <= 0) return undefined;
  const dispo = seances.filter((s) => s.semaines === semaines && s.date >= du).sort((a, b) => a.date.localeCompare(b.date));
  const duree = semaines * 7;
  let capital = 1;
  let t = du;
  let placements = 0;
  let sans = 0;
  for (const s of dispo) {
    if (uneFois && placements >= 1) break;
    if (s.date < t) continue;
    const echeance = ajouteJours(s.date, duree);
    if (echeance > au) break;
    const attente = daysBetween(t, s.date);
    capital *= facteurBancaire(tauxBancairePct, attente);
    sans += attente;
    capital /= prixDuBonEnPartDuNominal(s.tauxPct, duree);
    placements++;
    t = echeance;
  }
  if (!placements) return undefined;
  const reste = daysBetween(t, au);
  capital *= facteurBancaire(tauxBancairePct, reste);
  sans += reste;
  return { cumule: (capital - 1) * 100, annualise: rendementAnnualisePct(1, capital, jours), jours, placements, joursSansPlacement: sans };
}

export interface SensibiliteEntree {
  pire: number;
  mediane: number;
  meilleure: number;
  /** Combien de jours d'entrée possibles ont servi. */
  n: number;
}

/** La dispersion des rendements selon le jour d'entrée. Les dates ne sont pas rendues : « le bon jour » n'est pas ce qu'on veut montrer. */
export function sensibilite(rendements: number[]): SensibiliteEntree | undefined {
  if (!rendements.length) return undefined;
  const r = [...rendements].sort((a, b) => a - b);
  const m = r.length >> 1;
  return { pire: r[0], mediane: r.length % 2 ? r[m] : (r[m - 1] + r[m]) / 2, meilleure: r.at(-1)!, n: r.length };
}

/** Pour une détention de `dureeJours`, le rendement de chaque entrée possible dans la période. */
export function sensibiliteSurPoints(points: Point[], du: string, au: string, dureeJours: number, toleranceJours: number): SensibiliteEntree | undefined {
  const sortie = (d: string) => ajouteJours(d, dureeJours);
  const rendements: number[] = [];
  for (const p of points) {
    if (p.date < du || sortie(p.date) > au) continue;
    const fin = valeurAu(points, sortie(p.date), toleranceJours);
    const c = fin == null ? null : rendementCumulePct(p.valeur, fin);
    if (c != null) rendements.push(c);
  }
  return sensibilite(rendements);
}

/** Pour les bons : chaque séance de la période est une entrée possible. */
export function sensibiliteBonRoule(seances: SeanceBon[], semaines: number, du: string, au: string, dureeJours: number, tauxBancairePct: number, uneFois = false): SensibiliteEntree | undefined {
  const dates = [...new Set(seances.filter((s) => s.semaines === semaines && s.date >= du).map((s) => s.date))].sort();
  const rendements: number[] = [];
  for (const d of dates) {
    const fin = ajouteJours(d, dureeJours);
    if (fin > au) break;
    const r = bonRoule(seances, semaines, d, fin, tauxBancairePct, uneFois);
    if (r) rendements.push(r.cumule);
  }
  return sensibilite(rendements);
}

/** Les trois stratégies de bons du comparatif : rouler du 13 semaines, du 26 semaines, ou prendre un 52 semaines une fois. */
export const STRATEGIES_BONS = [
  { id: "bta13", semaines: 13, uneFois: false },
  { id: "bta26", semaines: 26, uneFois: false },
  { id: "bta52", semaines: 52, uneFois: true },
] as const;

export type NatureChiffre = "promesse" | "passe" | "cours" | "aucune";

export interface ProfilLigne {
  id: string;
  nature: NatureChiffre;
  /** Pour une dette : la durée jusqu'à l'échéance, en jours. */
  horizonJours?: number;
}

export type Verdict = { niveau: "ok" | "horizons" | "natures" };

/**
 * Deux lignes se comparent quand leurs chiffres sont de même nature et, pour une dette, d'horizons voisins (au plus du simple au double).
 * Le verdict avertit sans bloquer : le client reste libre de comparer ce qu'il veut, en le sachant.
 */
export function compatibilite(a: ProfilLigne, b: ProfilLigne): Verdict {
  if (a.nature !== b.nature || a.nature === "aucune") return { niveau: "natures" };
  if (a.nature === "promesse" && a.horizonJours && b.horizonJours) {
    const rapport = Math.max(a.horizonJours, b.horizonJours) / Math.min(a.horizonJours, b.horizonJours);
    if (rapport > 2) return { niveau: "horizons" };
  }
  return { niveau: "ok" };
}

/** Les lignes qui se comparent le mieux à une cible : même nature, horizon le plus proche. */
export function plusProches(cible: ProfilLigne, autres: ProfilLigne[], n = 3): ProfilLigne[] {
  const ecart = (p: ProfilLigne) => (cible.horizonJours && p.horizonJours ? Math.abs(Math.log(p.horizonJours / cible.horizonJours)) : 0);
  return autres
    .filter((p) => p.id !== cible.id && p.nature === cible.nature && p.nature !== "aucune" && compatibilite(cible, p).niveau === "ok")
    .sort((p, q) => ecart(p) - ecart(q))
    .slice(0, n);
}
