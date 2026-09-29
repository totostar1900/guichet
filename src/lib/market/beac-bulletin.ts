/**
 * La courbe que la BEAC publie, prise dans son bulletin mensuel.
 *
 * Elle paraît page 5 des « Statistiques Mensuelles du Marché des valeurs du
 * Trésor de la CEMAC », pour trois Trésors seulement : Cameroun, Congo, Gabon.
 * Ce sont exactement les trois que nos propres données permettent d'ajuster.
 *
 * Elle est publiée comme un graphique, sans table et sans note de méthode. Nous
 * ne recopions donc pas des chiffres : nous relevons les coordonnées de son
 * tracé vectoriel et les ramenons en pour cent par les graduations de son axe,
 * dont les positions sont elles aussi dans le document. Rien n'est estimé à
 * l'œil, et l'échelle se vérifie : les graduations doivent être colinéaires.
 *
 * TROIS PIÈGES, tous rencontrés.
 *
 * Un bulletin sur deux est un scan pur. Celui de janvier 2026 porte zéro
 * caractère sur ses seize pages : il n'y a rien à relever, et le robot doit le
 * dire plutôt que de rendre une courbe vide.
 *
 * La table des taux de participation est collée au graphique et contient
 * « 25,00 ». Pris pour une graduation, il posait l'échelle de zéro à vingt-cinq
 * au lieu de seize. Les graduations d'un axe partagent leur abscisse, ce que
 * les nombres d'une table ne font pas : on ne garde que la plus grande pile
 * verticale, et on exige qu'elle soit colinéaire.
 *
 * Et le premier tracé de la page est la rangée des marques de l'axe, quarante
 * points tous posés sur la ligne du zéro. Une courbe se reconnaît à ce qu'elle
 * monte : on écarte ce qui est plat.
 */

export interface SerieBeac {
  pays: string;
  /** La durée d'émission en années, et le taux en pour cent. */
  points: { annees: number; pct: number }[];
}

export interface ReleveBeac {
  /** Le numéro du bulletin, tel qu'il se nomme. */
  numero: number;
  /** Le mois qu'il arrête, en AAAA-MM. */
  mois: string;
  source: string;
  series: SerieBeac[];
}

/** Ce que le robot n'a pas pu faire, dit en clair plutôt qu'en silence. */
export type RefusBeac =
  | "le bulletin est un scan : aucun texte à relever"
  | "aucune courbe des taux dans ce bulletin"
  | "les graduations de l'axe ne sont pas alignées"
  | "les taux relevés sortent du monde";

/** Les bulletins listés sur la page, du plus récent au plus ancien. */
export function listerBulletins(html: string): { numero: number; mois: string; url: string }[] {
  const MOIS: Record<string, string> = {
    janvier: "01", février: "02", fevrier: "02", mars: "03", avril: "04", mai: "05", juin: "06",
    juillet: "07", août: "08", aout: "08", septembre: "09", octobre: "10", novembre: "11", décembre: "12", decembre: "12",
  };
  const out: { numero: number; mois: string; url: string }[] = [];
  for (const m of html.matchAll(/<a[^>]+href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = m[1].replace(/&amp;/g, "&");
    const titre = m[2].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const n = /N[°ºo]\s*(\d{1,3})/i.exec(titre);
    const d = new RegExp(`\\b(${Object.keys(MOIS).join("|")})\\s+(\\d{4})`, "i").exec(titre);
    if (!n || !d) continue;
    out.push({ numero: Number(n[1]), mois: `${d[2]}-${MOIS[d[1].toLowerCase()]}`, url: url.startsWith("http") ? url : `https://www.beac.int${url}` });
  }
  /* Le même bulletin peut être listé deux fois : on garde le premier vu. */
  const vus = new Map<number, (typeof out)[number]>();
  for (const b of out) if (!vus.has(b.numero)) vus.set(b.numero, b);
  return [...vus.values()].sort((a, b) => b.numero - a.numero);
}

/** Un mot de la page, avec sa position : c'est ce que pdf.js rend. */
export interface MotPdf {
  s: string;
  x: number;
  y: number;
}

/**
 * La calibration de l'ordonnée, et sa vérification.
 *
 * Deux graduations suffisent à poser une échelle ; trois permettent de vérifier
 * qu'elle est droite. On exige la vérification, parce qu'une échelle fausse rend
 * des chiffres qui ont l'air de chiffres.
 */
export function calibrer(mots: MotPdf[]): { pctDe: (y: number) => number; x: number; n: number } | RefusBeac {
  const candidats = mots.filter((m) => /^\d{1,2},00$/.test(m.s)).map((m) => ({ v: Number(m.s.replace(",", ".")), x: m.x, y: m.y }));
  const piles = new Map<number, typeof candidats>();
  for (const c of candidats) {
    const k = Math.round(c.x / 4);
    piles.set(k, [...(piles.get(k) ?? []), c]);
  }
  const pile = ([...piles.values()].sort((a, b) => b.length - a.length)[0] ?? []).sort((a, b) => a.v - b.v);
  if (pile.length < 3) return "aucune courbe des taux dans ce bulletin";
  const g0 = pile[0];
  const g1 = pile[pile.length - 1];
  const pente = (g1.y - g0.y) / (g1.v - g0.v);
  /* Colinéaires : chaque graduation doit tomber où la pente la place. */
  for (const g of pile) if (Math.abs(g0.y + (g.v - g0.v) * pente - g.y) > 1.5) return "les graduations de l'axe ne sont pas alignées";
  return { pctDe: (y: number) => g0.v + (y - g0.y) / pente, x: g0.x, n: pile.length };
}

/** Les durées en abscisse, dans l'ordre où elles sont écrites. */
export function abscisses(mots: MotPdf[], xAxe: number): { annees: number; x: number }[] {
  const out: { annees: number; x: number }[] = [];
  for (const m of mots) {
    if (m.x <= xAxe) continue;
    const mois = /^(\d{1,2})\s*mois$/i.exec(m.s);
    if (mois) {
      out.push({ annees: Number(mois[1]) / 12, x: m.x });
      continue;
    }
    const ans = /^(\d{1,2})(?:[,.](\d))?\s*(?:ans?|A)$/i.exec(m.s);
    if (ans) out.push({ annees: Number(ans[1]) + (ans[2] ? Number(ans[2]) / 10 : 0), x: m.x });
  }
  return out.sort((a, b) => a.x - b.x);
}

/** Les taux qu'un souverain de la zone peut porter : au-delà, on a mal relevé. */
const PLAUSIBLE = { bas: 0, haut: 30 };

/**
 * Les séries, tirées des tracés, nommées par l'ordre de la légende.
 *
 * L'ordre du flux suit celui de la légende, que le document écrit en toutes
 * lettres : « Cameroun, Congo, Gabon ». On ne devine donc pas les couleurs.
 */
export function series(traces: { x: number; y: number }[][], cal: { pctDe: (y: number) => number }, abs: { annees: number; x: number }[], noms: string[]): SerieBeac[] | RefusBeac {
  /* Une courbe monte ou descend ; la rangée des marques de l'axe est plate. */
  const courbes = traces
    .filter((t) => t.length >= 5)
    .filter((t) => Math.max(...t.map((q) => q.y)) - Math.min(...t.map((q) => q.y)) > 8)
    .sort((a, b) => b.length - a.length)
    .slice(0, noms.length);
  if (!courbes.length) return "aucune courbe des taux dans ce bulletin";

  const out: SerieBeac[] = [];
  for (const [i, t] of courbes.entries()) {
    const points = t.map((q) => {
      const d = abs.reduce((m, a) => (Math.abs(a.x - q.x) < Math.abs(m.x - q.x) ? a : m), abs[0]);
      return { annees: d.annees, pct: Math.round(cal.pctDe(q.y) * 100) / 100 };
    });
    if (points.some((p) => p.pct < PLAUSIBLE.bas || p.pct > PLAUSIBLE.haut)) return "les taux relevés sortent du monde";
    /* Une durée deux fois est un artefact du tracé : on garde le premier. */
    const par = new Map<number, number>();
    for (const p of points) if (!par.has(p.annees)) par.set(p.annees, p.pct);
    out.push({ pays: noms[i] ?? `série ${i + 1}`, points: [...par.entries()].map(([annees, pct]) => ({ annees, pct })).sort((a, b) => a.annees - b.annees) });
  }
  return out;
}

/** Les Trésors que le titre de la figure nomme, dans son ordre. */
export function tresorsDuTitre(texte: string): string[] {
  const m = /Courbes?\s+des\s+taux[^(]*\(([^)]+)\)/i.exec(texte);
  if (!m) return [];
  return m[1]
    .split(/\s*(?:,|et)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
}
