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
export type Source = "beac" | "nous" | "deux";

export interface Reglages {
  axe: Axe;
  pays: string[];
  /** AAAA-MM, le plus récent d'abord. Utilisés en axe durée. */
  mois: string[];
  /** La durée suivie, en années. Utilisée en axe temps. */
  duree: number;
  source: Source;
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

export type CleDePrereglage = "comparer" | "point" | "bouge" | "nous";

export function prereglages(d: Donnees): Record<CleDePrereglage, Reglages> {
  const principaux = PAYS_PUBLIES.filter((p) => d.parPays.get(p)?.[0] === d.recent);
  const cam = d.parPays.get("Cameroun") ?? [];
  const pris = [cam[0] ?? d.recent];
  for (const recul of [6, 18, 84]) {
    const m = procheDe(cam, pris[0], recul, pris);
    if (m) pris.push(m);
  }
  return {
    comparer: { axe: "duree", pays: principaux.length ? principaux : ["Cameroun"], mois: [d.recent], duree: 10, source: "beac" },
    point: { axe: "temps", pays: ["Cameroun", "Congo", "Gabon"], mois: [d.recent], duree: 10, source: "beac" },
    bouge: { axe: "duree", pays: ["Cameroun"], mois: [...pris].sort().reverse(), duree: 10, source: "beac" },
    nous: { axe: "duree", pays: ["Gabon"], mois: [d.recent], duree: 10, source: "deux" },
  };
}

type Params = Record<string, string | string[] | undefined>;
const liste = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v === undefined ? [] : [v]).flatMap((x) => x.split(",")).map((x) => x.trim()).filter(Boolean);

/** L'adresse → des réglages valides. Une valeur inconnue retombe sur celle du préréglage par défaut. */
export function lireReglages(sp: Params, d: Donnees): Reglages {
  const base = prereglages(d).comparer;
  if (!["axe", "pays", "mois", "d", "src"].some((k) => sp[k] !== undefined)) return base;
  const axe: Axe = liste(sp.axe)[0] === "temps" ? "temps" : "duree";
  const pays = [...new Set(liste(sp.pays).filter((p) => PAYS_PUBLIES.includes(p)))];
  const mois = [...new Set(liste(sp.mois).map(m7).filter((m) => d.mois.includes(m)))].sort().reverse().slice(0, MAX_MOIS);
  const duree = Number(liste(sp.d)[0]);
  const src = liste(sp.src)[0];
  const source: Source = axe === "temps" ? "beac" : src === "nous" || src === "deux" ? src : "beac";
  return {
    axe,
    pays: pays.length ? pays : base.pays,
    mois: mois.length ? mois : [d.recent],
    duree: d.durees.includes(duree) ? duree : 10,
    source,
  };
}

export function lien(r: Reglages, racine = "/desk/courbes-beac"): string {
  const q = new URLSearchParams();
  q.set("axe", r.axe);
  q.set("pays", r.pays.join(","));
  if (r.axe === "duree") {
    q.set("mois", r.mois.join(","));
    q.set("src", r.source);
  } else q.set("d", String(r.duree));
  return `${racine}?${q.toString()}`;
}

export const memeReglages = (a: Reglages, b: Reglages) =>
  a.axe === b.axe && a.source === b.source && a.pays.join() === b.pays.join() && (a.axe === "duree" ? a.mois.join() === b.mois.join() : a.duree === b.duree);

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
}

const FONDU = [100, 62, 42, 28];
const fondu = (c: string, i: number) => (i === 0 ? c : `color-mix(in srgb, ${c} ${FONDU[Math.min(i, FONDU.length - 1)]}%, transparent)`);
const indexMois = (m: string) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)) - 1;

export interface PointNous {
  pays: string;
  annees: number;
  pct: number;
}

export function modeleDeLaFigure(points: PointBeac[], r: Reglages, nous: PointNous[] = []): Modele {
  const series: Serie[] = [];
  const legende: Modele["legende"] = [];
  const manques: Modele["manques"] = [];
  const sauts: Saut[] = [];
  const avecBeac = r.source !== "nous" || r.axe === "temps";
  let nCourbes = 0;

  if (r.axe === "duree") {
    if (avecBeac) {
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
    }
    if (r.source !== "beac") {
      for (const pays of r.pays) {
        const pts = nous.filter((p) => p.pays === pays).sort((a, b) => a.annees - b.annees);
        if (!pts.length) continue;
        const couleur = COULEURS[pays] ?? "#888";
        series.push({ couleur, ronds: true, sansLigne: true, rayon: 4, pts: pts.map((p) => ({ x: p.annees, y: p.pct, titre: `${pays} · nous · ${p.pct.toLocaleString("fr-FR")} %` })) });
        legende.push({ couleur, texte: `${pays} · nos points`, trait: false });
      }
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
    }
  }
  return { series, nCourbes, trop: nCourbes > PLAFOND, manques, sauts, legende };
}
