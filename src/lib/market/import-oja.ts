import { apparier, type RapportOja, type SeanceOja, type TypeFichier } from "./oja";
import { CHAMPS, LIBELLE_CHAMP, egal, proposer, valeursPlates, verserExcel, type Champ, type Proposition, type SeancePlate, type Source, type SourcesSeance, patchDesColonnes, sourcesDe } from "./sources-seance";

/**
 * LE PLAN D'UN IMPORT OJA, calculé avant d'écrire quoi que ce soit (6 novembre 2026, planche 2A : « rien n'est écrit avant Confirmer »).
 *
 * Quatre compteurs : les séances NOUVELLES (absentes du Desk), les CONCORDANTES (déjà au Desk, mêmes chiffres), les ÉCARTS (déjà au Desk, chiffres différents : la règle 3B propose
 * une source par champ, le desk tranche) et les IGNORÉES (carnet du jour, séance rejetée, séance écartée au Desk). Les séances nouvelles se rangent en FIABLES (règle exacte, depuis le
 * 1er février 2023) et À CONFIRMER (état des offres ambigu avant).
 */

export interface SeanceDuDesk extends SeancePlate {
  id: string;
  codeEmission?: string;
  country?: string;
  instrument?: string;
  confirmedBy?: string;
  setAsideAt?: string;
}

export interface EcartPropose {
  champ: Champ;
  libelle: string;
  pdf?: number;
  excel?: number;
  proposition: Proposition;
}

export interface SeanceRapprochee {
  oja: SeanceOja;
  deskId: string;
  ecartJours: number;
  ecarts: EcartPropose[];
  /** Vrai si l'import ne change rien : mêmes valeurs OJA déjà versées, ou concordance totale sans écart nouveau. */
  inchangee: boolean;
}

export interface PlanImport {
  nouvelles: SeanceOja[];
  rapprochees: SeanceRapprochee[];
  ignoreesAuDesk: number;
  /** Les séances du Desk qu'OJA dit « rejetées » alors qu'elles portent des montants. */
  contredites: { deskId: string; isin: string; date: string }[];
  compteurs: { nouvellesFiables: number; nouvellesAConfirmer: number; concordantes: number; ecarts: number; ignorees: number; contredites: number };
}

const memesValeurs = (a?: SourcesSeance["excel"], b?: SourcesSeance["excel"]) => CHAMPS.every((c) => (a?.[c] ?? null) === (b?.[c] ?? null));

export function planifier(seances: SeanceOja[], rejeteesCles: string[], ignoreesOja: number, desk: SeanceDuDesk[]): PlanImport {
  const actifs = desk.filter((d) => !d.setAsideAt);
  const ecartees = desk.filter((d) => d.setAsideAt);
  const pris = new Set<SeanceDuDesk>();
  const nouvelles: SeanceOja[] = [];
  const rapprochees: SeanceRapprochee[] = [];
  let ignoreesAuDesk = 0;
  for (const s of seances) {
    const m = apparier(s, actifs, pris);
    if (!m) {
      if (apparier(s, ecartees)) ignoreesAuDesk++;
      else nouvelles.push(s);
      continue;
    }
    pris.add(m.seance);
    const avant = sourcesDe(m.seance);
    const apres = verserExcel(m.seance, s.valeurs, { importId: "?", fiabilite: s.fiabilite });
    const pdf = avant.pdf ?? valeursPlates(m.seance);
    const ecarts: EcartPropose[] = CHAMPS.filter((c) => pdf[c] != null && s.valeurs[c] != null && !egal(c, pdf[c]!, s.valeurs[c]!) && !(avant.ecarts ?? []).some((e) => e.champ === c)).map((c) => ({
      champ: c,
      libelle: LIBELLE_CHAMP[c],
      pdf: pdf[c],
      excel: s.valeurs[c],
      proposition: proposer(c, { date: m.seance.sessionOn, pdf, excel: s.valeurs, anomaliesVues: m.seance.anomaliesVues }),
    }));
    const inchangee = memesValeurs(avant.excel, apres.excel) && ecarts.length === 0 && avant.excel != null;
    rapprochees.push({ oja: s, deskId: m.seance.id, ecartJours: m.ecartJours, ecarts, inchangee });
  }
  const contredites: PlanImport["contredites"] = [];
  const cles = new Set(rejeteesCles);
  for (const d of actifs) {
    const isin = (d.codeEmission ?? "").replace(/\s/g, "").slice(0, 12).toUpperCase();
    const v = valeursPlates(d);
    if (!isin || !((v.bid ?? 0) > 0 || (v.served ?? 0) > 0)) continue;
    for (const k of cles) {
      const [i, date] = k.split("|");
      if (i === isin && Math.abs(Date.parse(`${date}T12:00:00Z`) - Date.parse(`${d.sessionOn}T12:00:00Z`)) <= 7 * 86400000) { contredites.push({ deskId: d.id, isin, date }); break; }
    }
  }
  return {
    nouvelles,
    rapprochees,
    ignoreesAuDesk,
    contredites,
    compteurs: {
      nouvellesFiables: nouvelles.filter((s) => s.fiabilite === "fiable").length,
      nouvellesAConfirmer: nouvelles.filter((s) => s.fiabilite !== "fiable").length,
      concordantes: rapprochees.filter((r) => r.ecarts.length === 0).length,
      ecarts: rapprochees.filter((r) => r.ecarts.length > 0).length,
      ignorees: ignoreesOja + ignoreesAuDesk,
      contredites: contredites.length,
    },
  };
}

/** Le lot que le navigateur envoie : les séances agrégées, les fichiers lus, ce qui a été ignoré. Aucun compte acheteur n'y figure. */
export function lotDepuis(r: RapportOja, fichiers: { type: TypeFichier; nom: string; lignes: number }[]) {
  const ign = r.ignorees;
  return { seances: r.seances, rejeteesCles: r.rejeteesCles, ignorees: ign.enCours + ign.rejetees + ign.sansOffreRetenue, lignes: r.lignes, plage: r.plage, fichiers, avertissements: r.avertissements };
}

/** Les choix du desk : « idDeLaSéance:champ » → la source retenue. Sans choix, la règle propose. */
export type Decisions = Record<string, Source>;

export interface VersementSeance {
  sources: SourcesSeance;
  colonnes: Record<Champ, number | null>;
}

/** Ce qu'on écrit sur une séance du Desk quand on y verse un jeu OJA, avec les choix du desk. Les choix déjà tranchés par le desk avant cet import sont gardés. */
export function verser(d: SeanceDuDesk, s: SeanceOja, importId: string, decisions: Decisions, par: string, le: string): VersementSeance {
  let sources = verserExcel(d, s.valeurs, { importId, fiabilite: s.fiabilite, carnet: s.carnet });
  for (const c of CHAMPS) {
    const choix = decisions[`${d.id}:${c}`];
    if (!choix) continue;
    const p = sources.pdf?.[c];
    const x = sources.excel?.[c];
    if (p == null || x == null || egal(c, p, x)) continue;
    const ecarts = (sources.ecarts ?? []).filter((e) => e.champ !== c);
    ecarts.push({ champ: c, pdf: p, excel: x, retenu: choix, motif: "tranché à l'import OJA", par, le });
    sources = { ...sources, retenu: { ...sources.retenu, [c]: choix }, ecarts };
  }
  return { sources, colonnes: patchDesColonnes(sources) };
}

/** Les valeurs d'une séance NOUVELLE : tout vient de l'Excel. */
export function sourcesDeNouvelle(s: SeanceOja, importId: string): SourcesSeance {
  const retenu: SourcesSeance["retenu"] = {};
  for (const c of CHAMPS) if (s.valeurs[c] != null) retenu[c] = "excel";
  return { excel: s.valeurs, retenu, importId, fiabilite: s.fiabilite, carnet: s.carnet };
}
