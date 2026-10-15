/**
 * CE QUE LA BEAC PUBLIE, MIS EN SÉRIES POUR UNE PAGE.
 *
 * Trois sources, et une seule décision qui les gouverne : D'OÙ VIENT CE
 * CHIFFRE. Un encours imprimé par la banque centrale, une somme de ses propres
 * lignes hebdomadaires et un relevé que nous avons fait nous-mêmes n'engagent
 * pas la maison de la même façon. Mélangés sur un écran, ils deviennent tous
 * les trois douteux ; séparés, les deux premiers peuvent partir chez un client.
 *
 * D'où `Provenance`, qui voyage avec chaque série et que la page affiche.
 *
 * CE MODULE NE SAIT RIEN DE LA BASE NI DU RENDU. Il prend des lignes, il rend
 * des séries, et c'est ce qui permet de l'éprouver sur des cas que la base ne
 * contient pas encore : un mois sans courbe, un pays écrit de deux façons, un
 * total qui ne tombe pas juste.
 */

/** D'où vient un chiffre, et ce qu'on a le droit d'en faire. */
export type Provenance =
  /** Imprimé tel quel par la BEAC. Publiable. */
  | "publie"
  /** Somme ou différence de lignes imprimées par la BEAC. Publiable. */
  | "somme"
  /** Notre propre lecture. Ne sort pas de la maison. */
  | "nous";

export const PAYS_BEAC = ["Cameroun", "Congo", "Gabon", "Tchad", "RCA", "Guinée éq."] as const;
export type PaysBeac = (typeof PAYS_BEAC)[number];
export const ZONE = "CEMAC";

/**
 * UN PAYS S'ÉCRIT DE DEUX FAÇONS SELON LA TABLE, et c'est un défaut mesuré :
 * « Centrafrique » dans les rapports hebdomadaires, « RCA » dans la statistique
 * mensuelle. Sans ce ramène-à-un, la fiche de la RCA serait vide d'un côté.
 *
 * Et « centrafric » n'est PAS dans « Centrafrique » : le mot s'arrête à
 * « centrafri ».
 */
export function nommerPays(brut: string | null | undefined): string {
  const f = String(brut ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  if (/cemac/.test(f)) return ZONE;
  if (/cameroun|cameroon/.test(f)) return "Cameroun";
  if (/congo/.test(f)) return "Congo";
  if (/gabon/.test(f)) return "Gabon";
  if (/tchad|\bchad\b/.test(f)) return "Tchad";
  if (/centrafri|\brca\b|central african/.test(f)) return "RCA";
  if (/guinee|guinea|equato/.test(f)) return "Guinée éq.";
  return String(brut ?? "");
}

/** « 2026-07-01 » → « 2026-07 ». Les séries de la BEAC sont mensuelles. */
export const mois7 = (d: string | null | undefined): string => String(d ?? "").slice(0, 7);

/** « 26 semaines » → 0,5 ; « 3 ans » → 3 ; « 3,5A » → 3,5. */
export function anneesDeTenor(t: string | null | undefined): number | undefined {
  const m = String(t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .match(/^(\d+(?:[,.]\d+)?)\s*(semaines?|mois|ans?|a)$/);
  if (!m) return undefined;
  const n = Number(m[1].replace(",", "."));
  if (!Number.isFinite(n)) return undefined;
  return m[2].startsWith("semaine") ? n / 52 : m[2] === "mois" ? n / 12 : n;
}

export interface PointSerie {
  m: string;
  v: number;
}
export interface PointCourbe {
  tenor: string;
  annees: number;
  taux: number;
}

export interface LigneCourbe {
  mois: string;
  pays: string;
  tenor: string;
  annees: number;
  taux: number;
}
export interface LigneEncours {
  mois: string;
  pays: string;
  /** En millions de francs, comme la pièce l'écrit. */
  encours: number;
}
export interface LigneCout {
  mois: string;
  pays: string;
  instrument: string;
  taux: number;
}
export interface LigneOperation {
  pays: string;
  operation: string;
  montant?: number;
  montantRealise?: number;
  tauxSouscription?: number;
  operationOn?: string;
  maturityOn?: string;
}

export interface VueBeac {
  pays: string[];
  /** Tous les mois où au moins une série dit quelque chose. */
  moisTous: string[];
  /** Les mois qui portent une courbe lisible. */
  moisCourbe: string[];
  maturites: number[];
  /** `mois|pays` → la courbe de ce mois pour ce pays. */
  courbes: Record<string, PointCourbe[]>;
  /** `pays|annees` → le rendement de cette maturité, mois par mois. */
  parMaturite: Record<string, PointSerie[]>;
  /** `pays` → le dix ans moins le un an, mois par mois. */
  pente: Record<string, PointSerie[]>;
  /** `pays` → l'encours en milliards, mois par mois. La zone est recalculée. */
  encours: Record<string, PointSerie[]>;
  /** `pays|instrument` → le coût moyen, mois par mois. */
  couts: Record<string, PointSerie[]>;
  /** `pays` → ce qui a été mis en adjudication et levé, mois par mois. */
  offre: Record<string, { m: string; prevu: number; realise: number; n: number }[]>;
  /** `pays` → le taux de souscription moyen du mois, et sur combien de séances. */
  souscription: Record<string, { m: string; v: number; n: number }[]>;
  /** `pays` → ce qui tombe, trimestre par trimestre, en milliards. */
  mur: Record<string, PointSerie[]>;
}

/** « 2026-08-14 » → « 2026-T3 ». */
export const trimestreDe = (d: string): string => `${d.slice(0, 4)}-T${Math.floor((Number(d.slice(5, 7)) - 1) / 3) + 1}`;

const trier = (a: { m: string }, b: { m: string }) => a.m.localeCompare(b.m);
const ranger = <T extends { m: string }>(o: Record<string, T[]>) => {
  for (const k of Object.keys(o)) o[k].sort(trier);
  return o;
};

/**
 * Les séries, construites une fois pour toute la page.
 *
 * `aujourdHui` ne sert qu'au mur d'échéances, qui n'a pas à montrer ce qui est
 * déjà tombé : une charge passée n'est plus une charge.
 */
export function vueBeac(
  courbes: LigneCourbe[],
  encoursLignes: LigneEncours[],
  coutsLignes: LigneCout[],
  operations: LigneOperation[],
): VueBeac {
  /* ---- les courbes ---- */
  const parMoisPays: Record<string, PointCourbe[]> = {};
  const parMaturite: Record<string, PointSerie[]> = {};
  for (const c of courbes) {
    const p = nommerPays(c.pays);
    const m = mois7(c.mois);
    (parMoisPays[`${m}|${p}`] ??= []).push({ tenor: c.tenor, annees: c.annees, taux: c.taux });
    (parMaturite[`${p}|${c.annees}`] ??= []).push({ m, v: c.taux });
  }
  for (const k of Object.keys(parMoisPays)) parMoisPays[k].sort((a, b) => a.annees - b.annees);
  ranger(parMaturite);

  /**
   * LA PENTE NE SE CALCULE QUE SI LES DEUX POINTS EXISTENT LE MÊME MOIS.
   * Prendre le dix ans d'un mois et le un an d'un autre comparerait deux
   * dates, pas deux maturités, et l'écart passerait pour du prix du temps.
   */
  const pente: Record<string, PointSerie[]> = {};
  for (const p of new Set(courbes.map((c) => nommerPays(c.pays)))) {
    const longs = new Map((parMaturite[`${p}|10`] ?? []).map((x) => [x.m, x.v]));
    const courts = new Map((parMaturite[`${p}|1`] ?? []).map((x) => [x.m, x.v]));
    const s = [...longs.keys()]
      .filter((m) => courts.has(m))
      .sort()
      .map((m) => ({ m, v: Number((longs.get(m)! - courts.get(m)!).toFixed(2)) }));
    if (s.length) pente[p] = s;
  }

  /* ---- l'encours, en milliards ---- */
  const encours: Record<string, PointSerie[]> = {};
  for (const e of encoursLignes) {
    const p = nommerPays(e.pays);
    if (p === ZONE) continue;
    (encours[p] ??= []).push({ m: mois7(e.mois), v: e.encours / 1000 });
  }
  ranger(encours);
  /**
   * LE TOTAL DE ZONE SE REFAIT PAR LA SOMME, et seulement quand les six pays
   * sont là. La pièce ne l'imprime que pour son propre mois ; l'additionner à
   * quatre pays donnerait une zone qui rétrécit les mois incomplets.
   */
  const parMois = new Map<string, number[]>();
  for (const e of encoursLignes) {
    const p = nommerPays(e.pays);
    if (p === ZONE) continue;
    const m = mois7(e.mois);
    parMois.set(m, [...(parMois.get(m) ?? []), e.encours / 1000]);
  }
  const zone = [...parMois.entries()]
    .filter(([, v]) => v.length === PAYS_BEAC.length)
    .map(([m, v]) => ({ m, v: v.reduce((a, b) => a + b, 0) }))
    .sort(trier);
  if (zone.length) encours[ZONE] = zone;

  /* ---- le coût des ressources ---- */
  const couts: Record<string, PointSerie[]> = {};
  for (const c of coutsLignes) (couts[`${nommerPays(c.pays)}|${c.instrument}`] ??= []).push({ m: mois7(c.mois), v: c.taux });
  ranger(couts);

  /* ---- la demande : prévu, réalisé, souscription ---- */
  const brut = new Map<string, { prevu: number; realise: number; n: number }>();
  const sous = new Map<string, number[]>();
  for (const o of operations) {
    const m = mois7(o.operationOn);
    if (!/^\d{4}-\d{2}$/.test(m)) continue;
    const p = nommerPays(o.pays);
    /**
     * ON NE COMPTE QUE LES OPÉRATIONS DONT LES DEUX CÔTÉS SONT CONNUS.
     *
     * Le tableau de bord annonce 2 189 opérations ; le rapport hebdomadaire
     * n'en a constaté que 1 128. Additionner tout le prévu contre le réalisé
     * connu donnait un taux de service de 33 %, qui ne mesure pas la demande
     * mais notre retard de lecture. Une opération sans réalisé n'est pas une
     * adjudication ratée, c'est une adjudication pas encore rapportée.
     */
    if ((o.operation === "emission" || o.operation === "abondement") && o.montantRealise != null && o.montant != null) {
      const x = brut.get(`${p}|${m}`) ?? { prevu: 0, realise: 0, n: 0 };
      x.prevu += o.montant;
      x.realise += o.montantRealise;
      x.n += 1;
      brut.set(`${p}|${m}`, x);
    }
    if (o.tauxSouscription != null) sous.set(`${p}|${m}`, [...(sous.get(`${p}|${m}`) ?? []), o.tauxSouscription]);
  }
  const offre: Record<string, { m: string; prevu: number; realise: number; n: number }[]> = {};
  for (const [k, v] of brut) {
    const [p, m] = k.split("|");
    (offre[p] ??= []).push({ m, prevu: v.prevu / 1e9, realise: v.realise / 1e9, n: v.n });
  }
  ranger(offre);
  const souscription: Record<string, { m: string; v: number; n: number }[]> = {};
  for (const [k, v] of sous) {
    const [p, m] = k.split("|");
    (souscription[p] ??= []).push({ m, v: Number((v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)), n: v.length });
  }
  ranger(souscription);

  /* ---- le mur d'échéances ---- */
  const parTrim = new Map<string, number>();
  for (const o of operations) {
    if (!o.maturityOn || o.montantRealise == null) continue;
    if (o.operation !== "emission" && o.operation !== "abondement") continue;
    const k = `${nommerPays(o.pays)}|${trimestreDe(o.maturityOn)}`;
    parTrim.set(k, (parTrim.get(k) ?? 0) + o.montantRealise / 1e9);
  }
  const mur: Record<string, PointSerie[]> = {};
  for (const [k, v] of parTrim) {
    const [p, t] = k.split("|");
    (mur[p] ??= []).push({ m: t, v: Number(v.toFixed(2)) });
  }
  ranger(mur);

  const moisCourbe = [...new Set(courbes.map((c) => mois7(c.mois)))].sort();
  const moisTous = [
    ...new Set([
      ...moisCourbe,
      ...Object.values(encours).flatMap((s) => s.map((x) => x.m)),
      ...Object.values(offre).flatMap((s) => s.map((x) => x.m)),
      ...Object.values(souscription).flatMap((s) => s.map((x) => x.m)),
      ...Object.values(couts).flatMap((s) => s.map((x) => x.m)),
    ]),
  ].sort();

  return {
    pays: [...PAYS_BEAC],
    moisTous,
    moisCourbe,
    maturites: [...new Set(courbes.map((c) => c.annees))].sort((a, b) => a - b),
    courbes: parMoisPays,
    parMaturite,
    pente,
    encours,
    couts,
    offre,
    souscription,
    mur,
  };
}

/**
 * NOS SÉANCES POSÉES SUR LEUR COURBE.
 *
 * Le seul panneau de la page qui engage notre lecture, et il ne paraît que
 * dans la vue du desk. On ne rapproche QUE d'une maturité voisine : un bon à
 * treize semaines ne se compare pas au point d'un an, et le faire ferait
 * conclure à un écart qui n'est qu'une différence de durée.
 */
export interface SeanceLue {
  pays: string;
  instrument?: string;
  tenor?: string;
  sessionOn: string;
  taux?: number;
}
export interface Rapprochement {
  m: string;
  pays: string;
  instrument: string;
  tenor: string;
  annees: number;
  nous: number;
  beac: number;
}

export function rapprocher(seances: SeanceLue[], vue: VueBeac, tolerance = 0.15): Rapprochement[] {
  const dispo = vue.maturites;
  if (!dispo.length) return [];
  const out: Rapprochement[] = [];
  for (const s of seances) {
    if (s.taux == null) continue;
    const a = anneesDeTenor(s.tenor);
    if (a == null) continue;
    const proche = dispo.reduce((best, x) => (Math.abs(x - a) < Math.abs(best - a) ? x : best), dispo[0]);
    if (Math.abs(proche - a) > Math.max(0.1, a * tolerance)) continue;
    const p = nommerPays(s.pays);
    const courbe = vue.courbes[`${mois7(s.sessionOn)}|${p}`];
    const point = courbe?.find((q) => Math.abs(q.annees - proche) < 1e-9);
    if (!point) continue;
    out.push({ m: mois7(s.sessionOn), pays: p, instrument: s.instrument ?? "—", tenor: s.tenor ?? "—", annees: a, nous: s.taux, beac: point.taux });
  }
  return out.sort((a, b) => b.m.localeCompare(a.m));
}

/**
 * NOTRE COUVERTURE : quelle part de l'encours officiel nos pièces expliquent.
 *
 * ON NE SOUSTRAIT PAS, ON POSE CÔTE À CÔTE. La BEAC compte tout l'encours sans
 * publier sa méthode ; nous comptons ce que nous avons vu adjuger. L'écart
 * n'est pas une erreur, c'est une différence de définition, et la page le dit.
 */
export interface LigneCouverture {
  pays: string;
  /** L'encours officiel du dernier mois connu, en milliards. */
  beac: number;
  /** Ce que nos communiqués expliquent, non échu, en milliards. */
  communiques: number;
  /** Le flux net lu dans les rapports hebdomadaires, en milliards. */
  flux: number;
  seances: number;
  operations: number;
}

export function couverture(
  encoursLignes: LigneEncours[],
  seances: { pays: string; sessionOn: string; maturityOn?: string; servi?: number }[],
  operations: LigneOperation[],
): { auMois: string; lignes: LigneCouverture[] } {
  const mois = [...new Set(encoursLignes.map((e) => mois7(e.mois)))].sort();
  const auMois = mois[mois.length - 1] ?? "";
  const stock = new Map<string, number>();
  const nSeances = new Map<string, number>();
  for (const s of seances) {
    const p = nommerPays(s.pays);
    nSeances.set(p, (nSeances.get(p) ?? 0) + 1);
    if (s.servi == null) continue;
    /* Une ligne échue ne fait plus partie de l'encours. Sans échéance connue,
       on ne devine pas : la séance compte. */
    if (s.maturityOn && mois7(s.maturityOn) <= auMois) continue;
    stock.set(p, (stock.get(p) ?? 0) + s.servi);
  }
  const flux = new Map<string, number>();
  const nOps = new Map<string, number>();
  for (const o of operations) {
    const p = nommerPays(o.pays);
    nOps.set(p, (nOps.get(p) ?? 0) + 1);
    if (o.montantRealise == null) continue;
    if (o.operation === "emission" || o.operation === "abondement") flux.set(p, (flux.get(p) ?? 0) + o.montantRealise);
    else if (o.operation === "remboursement") flux.set(p, (flux.get(p) ?? 0) - o.montantRealise);
  }
  return {
    auMois,
    lignes: PAYS_BEAC.map((p) => ({
      pays: p,
      beac: (encoursLignes.find((e) => mois7(e.mois) === auMois && nommerPays(e.pays) === p)?.encours ?? 0) / 1000,
      communiques: (stock.get(p) ?? 0) / 1e9,
      flux: (flux.get(p) ?? 0) / 1e9,
      seances: nSeances.get(p) ?? 0,
      operations: nOps.get(p) ?? 0,
    })),
  };
}
