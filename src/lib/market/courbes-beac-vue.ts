import { tendanceLineaire } from "@/lib/finance";
import type { Serie } from "./trace";

/**
 * LE GRAPHIQUE DÉDIÉ AUX COURBES DE LA BEAC : SES RÉGLAGES ET SON MODÈLE, SANS DESSIN.
 *
 * Un seul graphique, deux axes. En axe « durée », chaque courbe est un Trésor à un
 * mois : on compare des pays, ou on regarde une courbe bouger. En axe « temps »,
 * chaque courbe est un Trésor à UNE durée, mois après mois : on suit un point. Les
 * quatre préréglages ne sont que quatre états de ces réglages.
 *
 * Tout vit dans l'adresse (un écran du desk se partage par un lien) ; ce module lit
 * l'adresse, valide chaque valeur contre les données (une valeur qu'on ne connaît pas
 * retombe sur le défaut, jamais sur une figure vide), et rend le modèle que la page
 * pose. Il ne dessine rien et ne lit rien : les points lui arrivent.
 *
 * TROIS RÈGLES, qui sont celles du reste de la maison :
 *   — Un mois sans feuille lisible est un TROU : la ligne s'interrompt, elle ne joint
 *     jamais deux mois séparés par un manque.
 *   — Un saut d'un point à l'autre de trois points de pourcentage ou plus est SIGNALÉ,
 *     avec ses deux valeurs : c'est le chiffre de la BEAC, et un desk doit le savoir.
 *   — Au-delà de douze courbes la figure ne se trace pas : elle dit de réduire.
 */
export interface PointBeac {
  mois: string; // AAAA-MM-01
  pays: string;
  annees: number;
  tenor: string;
  taux: number;
}

export type Axe = "duree" | "temps";

export interface Reglages {
  axe: Axe;
  pays: string[];
  /** AAAA-MM, le plus récent d'abord. Utilisés en axe durée. */
  mois: string[];
  /** La durée suivie, en années. Utilisée en axe temps. */
  duree: number;
}

export const PLAFOND = 12;
export const MAX_MOIS = 4;
export const SAUT = 3;
/** Ceux que la BEAC publie (le Tchad seulement en 2016-2017), et ceux qu'elle ne publie pas. */
export const PAYS_PUBLIES = ["Cameroun", "Congo", "Gabon", "Tchad"];
export const PAYS_NON_PUBLIES = ["RCA", "Guinée éq."];

export const COULEURS: Record<string, string> = { Cameroun: "#1d4ed8", Congo: "#b45309", Gabon: "#15803d", Tchad: "#7c3aed" };

export interface Donnees {
  /** Tous les mois qui portent une feuille lisible, le plus récent d'abord. */
  mois: string[];
  parPays: Map<string, string[]>;
  /** Les durées que les feuilles portent, en années, croissantes. */
  durees: number[];
  recent: string;
}

const m7 = (m: string) => m.slice(0, 7);

export function donneesDe(points: PointBeac[]): Donnees {
  const parPays = new Map<string, Set<string>>();
  const durees = new Set<number>();
  for (const p of points) {
    if (!parPays.has(p.pays)) parPays.set(p.pays, new Set());
    parPays.get(p.pays)!.add(m7(p.mois));
    durees.add(p.annees);
  }
  const tous = [...new Set([...parPays.values()].flatMap((s) => [...s]))].sort().reverse();
  return {
    mois: tous,
    parPays: new Map([...parPays].map(([k, v]) => [k, [...v].sort().reverse()])),
    durees: [...durees].sort((a, b) => a - b),
    recent: tous[0] ?? "",
  };
}

const ecartMois = (a: string, b: string) => (Number(a.slice(0, 4)) - Number(b.slice(0, 4))) * 12 + (Number(a.slice(5, 7)) - Number(b.slice(5, 7)));

/** Le mois disponible le plus proche d'un recul donné (en mois) avant le plus récent, jamais déjà pris. */
const procheDe = (dispo: string[], recent: string, recul: number, pris: string[]) =>
  dispo.filter((m) => !pris.includes(m)).sort((a, b) => Math.abs(ecartMois(recent, a) - recul) - Math.abs(ecartMois(recent, b) - recul))[0];

export type CleDePrereglage = "comparer" | "point" | "bouge";

export function prereglages(d: Donnees): Record<CleDePrereglage, Reglages> {
  const principaux = PAYS_PUBLIES.filter((p) => d.parPays.get(p)?.[0] === d.recent);
  const cam = d.parPays.get("Cameroun") ?? [];
  const pris = [cam[0] ?? d.recent];
  for (const recul of [6, 18, 84]) {
    const m = procheDe(cam, pris[0], recul, pris);
    if (m) pris.push(m);
  }
  return {
    comparer: { axe: "duree", pays: principaux.length ? principaux : ["Cameroun"], mois: [d.recent], duree: 10 },
    point: { axe: "temps", pays: ["Cameroun", "Congo", "Gabon"], mois: [d.recent], duree: 10 },
    bouge: { axe: "duree", pays: ["Cameroun"], mois: [...pris].sort().reverse(), duree: 10 },
  };
}

type Params = Record<string, string | string[] | undefined>;
const liste = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v === undefined ? [] : [v]).flatMap((x) => x.split(",")).map((x) => x.trim()).filter(Boolean);

/** L'adresse → des réglages valides. Une valeur inconnue retombe sur celle du préréglage par défaut. */
export function lireReglages(sp: Params, d: Donnees): Reglages {
  const base = prereglages(d).comparer;
  if (!["axe", "pays", "mois", "d"].some((k) => sp[k] !== undefined)) return base;
  const axe: Axe = liste(sp.axe)[0] === "temps" ? "temps" : "duree";
  const pays = [...new Set(liste(sp.pays).filter((p) => PAYS_PUBLIES.includes(p)))];
  const mois = [...new Set(liste(sp.mois).map(m7).filter((m) => d.mois.includes(m)))].sort().reverse().slice(0, MAX_MOIS);
  const duree = Number(liste(sp.d)[0]);
  return {
    axe,
    pays: pays.length ? pays : base.pays,
    mois: mois.length ? mois : [d.recent],
    duree: d.durees.includes(duree) ? duree : 10,
  };
}

export function lien(r: Reglages, racine = "/desk/courbes-beac"): string {
  const q = new URLSearchParams();
  q.set("axe", r.axe);
  q.set("pays", r.pays.join(","));
  if (r.axe === "duree") {
    q.set("mois", r.mois.join(","));
  } else q.set("d", String(r.duree));
  return `${racine}?${q.toString()}`;
}

export const memeReglages = (a: Reglages, b: Reglages) =>
  a.axe === b.axe && a.pays.join() === b.pays.join() && (a.axe === "duree" ? a.mois.join() === b.mois.join() : a.duree === b.duree);

export interface Saut {
  pays: string;
  mois: string;
  de: number;
  vers: number;
  /** Mois de la valeur précédente. */
  depuis: string;
}

export interface Modele {
  series: Serie[];
  /** Le nombre de courbes de la BEAC que la figure demande. */
  nCourbes: number;
  trop: boolean;
  /** Les (Trésor, mois) demandés sans feuille lisible : des trous. */
  manques: { pays: string; mois: string }[];
  sauts: Saut[];
  /** Les noms de la légende : ce que chaque couleur est. */
  legende: { couleur: string; texte: string; trait: boolean }[];
  /** Axe temps seulement : la droite des moindres carrés de chaque point suivi, ou pourquoi elle manque. */
  tendances: TendanceDuPoint[];
}

/** Au-dessous, une droite ne dit rien : on l'écrit, on ne la trace pas. */
export const MIN_POINTS_TENDANCE = 6;

export interface TendanceDuPoint {
  pays: string;
  /** Points de base par an : le taux monte (+) ou descend (−) de tant chaque année. */
  pbParAn?: number;
  r2?: number;
  n: number;
  depuis: string;
  jusqua: string;
}

const FONDU = [100, 62, 42, 28];
const fondu = (c: string, i: number) => (i === 0 ? c : `color-mix(in srgb, ${c} ${FONDU[Math.min(i, FONDU.length - 1)]}%, transparent)`);
const indexMois = (m: string) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)) - 1;

export function modeleDeLaFigure(points: PointBeac[], r: Reglages): Modele {
  const series: Serie[] = [];
  const legende: Modele["legende"] = [];
  const manques: Modele["manques"] = [];
  const sauts: Saut[] = [];
  const tendances: TendanceDuPoint[] = [];
  let nCourbes = 0;

  if (r.axe === "duree") {
    for (const pays of r.pays) {
      r.mois.forEach((m, i) => {
        const pts = points.filter((p) => p.pays === pays && m7(p.mois) === m).sort((a, b) => a.annees - b.annees);
        if (!pts.length) {
          manques.push({ pays, mois: m });
          return;
        }
        nCourbes += 1;
        const couleur = fondu(COULEURS[pays] ?? "#888", i);
        series.push({ couleur, pts: pts.map((p) => ({ x: p.annees, y: p.taux, titre: `${pays} ${m} · ${p.tenor} · ${p.taux.toLocaleString("fr-FR")} %` })) });
        legende.push({ couleur, texte: r.mois.length > 1 ? `${pays} ${m}` : pays, trait: true });
      });
    }
  } else {
    for (const pays of r.pays) {
      const couleur = COULEURS[pays] ?? "#888";
      const pts = points
        .filter((p) => p.pays === pays && p.annees === r.duree)
        .map((p) => ({ mois: m7(p.mois), y: p.taux }))
        .sort((a, b) => a.mois.localeCompare(b.mois));
      if (!pts.length) {
        manques.push({ pays, mois: "" });
        continue;
      }
      nCourbes += 1;
      legende.push({ couleur, texte: pays, trait: true });
      let segment: typeof pts = [];
      const pose = () => {
        if (segment.length) series.push({ couleur, ronds: true, rayon: 2.5, pts: segment.map((s) => ({ x: Number(s.mois.slice(0, 4)) + (Number(s.mois.slice(5, 7)) - 1) / 12, y: s.y, titre: `${pays} ${s.mois} · ${s.y.toLocaleString("fr-FR")} %` })) });
        segment = [];
      };
      pts.forEach((p, i) => {
        const prec = pts[i - 1];
        /* UN MOIS MANQUANT INTERROMPT LA LIGNE : le segment se ferme et un nouveau s'ouvre. */
        if (prec && indexMois(p.mois) - indexMois(prec.mois) > 1) pose();
        if (prec && Math.abs(p.y - prec.y) >= SAUT) sauts.push({ pays, mois: p.mois, de: prec.y, vers: p.y, depuis: prec.mois });
        segment.push(p);
      });
      pose();
      /* LA TENDANCE SE CALCULE SUR LES POINTS LUS, trous compris : elle ne joint rien, elle ajuste. Le calcul est celui de finance.ts. */
      const xy = pts.map((p) => ({ x: Number(p.mois.slice(0, 4)) + (Number(p.mois.slice(5, 7)) - 1) / 12, y: p.y }));
      const fiche: TendanceDuPoint = { pays, n: pts.length, depuis: pts[0].mois, jusqua: pts[pts.length - 1].mois };
      const d = tendanceLineaire(xy, MIN_POINTS_TENDANCE);
      if (d) {
        fiche.pbParAn = d.pente * 100;
        fiche.r2 = d.r2;
        const [a, b] = [xy[0].x, xy[xy.length - 1].x];
        series.push({ couleur, pointille: true, pts: [a, b].map((x) => ({ x, y: d.ordonnee + d.pente * x, titre: `${pays} · tendance ${(d.pente * 100).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} pb/an` })) });
      }
      tendances.push(fiche);
    }
  }
  return { series, nCourbes, trop: nCourbes > PLAFOND, manques, sauts, legende, tendances };
}

/** Une ligne du fichier : un point de courbe de la BEAC, avec de quoi remonter à sa feuille. */
export interface LigneBeac {
  pays: string;
  mois: string;
  duree: string;
  annees: number;
  taux: number;
  feuille: string;
}

/**
 * CE QUE L'EXPORT EMPORTE : les points que la figure trace, ou toute la base.
 *
 * Les réglages de l'adresse décident (axe durée : les Trésors et les mois choisis ;
 * axe temps : les Trésors choisis, à la durée suivie, sur tous les mois). `tout`
 * ignore les réglages. Ce sont les chiffres de la BEAC, tels que la base les porte,
 * rien de plus : ni lissage, ni nos courbes.
 */
export function lignesBeac(points: (PointBeac & { sourceChemin?: string })[], r: Reglages, tout = false): LigneBeac[] {
  const gardes = tout
    ? points
    : points.filter((p) => r.pays.includes(p.pays) && (r.axe === "duree" ? r.mois.includes(m7(p.mois)) : p.annees === r.duree));
  return gardes
    .map((p) => ({ pays: p.pays, mois: m7(p.mois), duree: p.tenor, annees: p.annees, taux: p.taux, feuille: p.sourceChemin && /^https?:\/\//.test(p.sourceChemin) ? p.sourceChemin : "" }))
    .sort((a, b) => a.pays.localeCompare(b.pays) || a.mois.localeCompare(b.mois) || a.annees - b.annees);
}
