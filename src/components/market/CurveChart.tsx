import { getT } from "@/i18n/server";
import type { Country } from "@/lib/domain/types";
import { horizon, type CountryCurve, type CurvePoint } from "@/lib/market/curve";
import styles from "./CurveChart.module.css";

/**
 * La courbe des taux de la zone, dessinée.
 *
 * Six Trésors empruntent au même guichet, et leurs courbes ne se lisent que
 * côte à côte : un 26 semaines congolais à 7,60 % ne dit rien seul, il dit
 * quelque chose au-dessus d'un 26 semaines camerounais à 7,31 %. Le graphique
 * n'existe donc que pour cette comparaison, et tout le reste s'efface devant
 * elle.
 *
 * Trois partis pris de tracé.
 *
 *   L'abscisse est logarithmique. Trois mois et dix ans sur une échelle
 *   linéaire écrasent toute la partie courte contre l'axe, là où se passe
 *   l'essentiel des séances de la zone.
 *
 *   La couleur ne porte jamais seule l'identité : chaque ligne est nommée à
 *   son extrémité droite, et le tableau sous le graphique donne tous les
 *   nombres. Un lecteur qui ne distingue pas le vert du bleu lit la même
 *   chose.
 *
 *   Un point creux est une séance mince, servie à un ou deux soumissionnaires
 *   ou non couverte. Le chiffre reste vrai, il cesse d'être représentatif, et
 *   la forme le dit sans qu'on ait à le lire.
 */

export const COUNTRY_COLOR: Record<Country, string> = {
  Cameroun: "#0b2545",
  Congo: "#0e7490",
  Gabon: "#15803d",
  Tchad: "#a16207",
  "Guinée éq.": "#be185d",
  RCA: "#6d28d9",
};

const pct = (v: number, d = 2) => `${v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d })} %`;

function ticks(min: number, max: number, n = 4): number[] {
  if (max === min) return [min];
  const brut = (max - min) / n;
  const p = 10 ** Math.floor(Math.log10(brut));
  const pas = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= brut) ?? brut;
  const out: number[] = [];
  for (let v = Math.floor(min / pas) * pas; v <= max + pas / 2; v += pas) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

export async function CurveChart({ countries, height = 280, ariaLabel }: { countries: CountryCurve[]; height?: number; ariaLabel: string }) {
  const t = await getT();
  const pts = countries.flatMap((c) => c.points);
  if (!pts.length) return null;

  const W = 720;
  const H = height;
  // La marge droite loge le nom du Trésor, posé au bout de sa ligne.
  const P = { l: 52, r: 92, t: 18, b: 40 };

  const xs = pts.map((p) => Math.log(p.years));
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const ys = pts.map((p) => p.yield.pct);
  const marge = (Math.max(...ys) - Math.min(...ys)) * 0.15 || 0.5;
  const lo = Math.min(...ys) - marge;
  const hi = Math.max(...ys) + marge;

  const X = (annees: number) => P.l + ((Math.log(annees) - x0) / (x1 - x0 || 1)) * (W - P.l - P.r);
  const Y = (v: number) => H - P.b - ((v - lo) / (hi - lo || 1)) * (H - P.t - P.b);

  // Les abscisses sont les horizons réellement adjugés, pas une graduation
  // inventée : une courbe de la zone ne passe pas par des points qui n'existent
  // pas. Le dédoublonnage se fait sur l'horizon affiché et non sur l'étiquette
  // du produit, deux abondements pouvant s'appeler « 6 ans » sans se poser au
  // même endroit.
  const mot = (p: CurvePoint) => {
    const { n, unit } = horizon(p.years);
    return `${n.toLocaleString("fr-FR")} ${t(unit)}`;
  };
  const durees = [...new Map(pts.map((p) => [mot(p), p])).values()].sort((a, b) => a.years - b.years);

  /**
   * Les durées qui portent une étiquette.
   *
   * On part du bout, qui se lit en premier et ne cède jamais, et on remonte :
   * une durée garde son étiquette si elle laisse de la place à celle déjà
   * retenue. Dans l'autre sens, sur une échelle log, tout le long finissait
   * par céder et l'axe s'arrêtait de compter au milieu de la courbe.
   */
  const ECART = 42;
  const nommees = new Set<string>();
  let droite = Number.POSITIVE_INFINITY;
  for (let i = durees.length - 1; i >= 0; i--) {
    const x = X(durees[i].years);
    if (droite - x < ECART) continue;
    nommees.add(mot(durees[i]));
    droite = x;
  }
  const grille = ticks(lo, hi);

  return (
    <figure className={styles.fig}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className={styles.svg}>
        {grille.map((v) => (
          <g key={v}>
            <line x1={P.l} y1={Y(v)} x2={W - P.r} y2={Y(v)} className={styles.grid} />
            <text x={P.l - 8} y={Y(v) + 3.5} textAnchor="end" className={styles.tick}>
              {pct(v, 1)}
            </text>
          </g>
        ))}
        <path d={`M${P.l} ${P.t}V${H - P.b}H${W - P.r}`} className={styles.axis} />

        {durees.map((d) => {
          const x = X(d.years);
          return (
            <g key={mot(d)}>
              <line x1={x} y1={P.t} x2={x} y2={H - P.b} className={styles.grid} />
              {nommees.has(mot(d)) && (
                <text x={x} y={H - P.b + 16} textAnchor="middle" className={styles.tick}>
                  {mot(d)}
                </text>
              )}
            </g>
          );
        })}

        {countries.map((c) => {
          const couleur = COUNTRY_COLOR[c.country];
          const bout = c.points[c.points.length - 1];
          return (
            <g key={c.country}>
              {c.points.length > 1 && <polyline points={c.points.map((p) => `${X(p.years)},${Y(p.yield.pct)}`).join(" ")} fill="none" stroke={couleur} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
              {c.points.map((p) => (
                <circle key={p.from.id} cx={X(p.years)} cy={Y(p.yield.pct)} r={4} fill={p.thin ? "var(--surface)" : couleur} stroke={couleur} strokeWidth={2}>
                  <title>{`${c.country} · ${p.tenor} · ${t("{d} à courir", { d: mot(p) })} · ${pct(p.yield.pct)} · ${t("séance du {d}", { d: p.from.sessionOn })}${p.thin ? ` · ${t("séance mince")}` : ""}`}</title>
                </circle>
              ))}
              <text x={X(bout.years) + 9} y={Y(bout.yield.pct) + 3.5} className={styles.name} fill={couleur}>
                {c.country}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className={styles.cap}>
        {t("Rendement actuariel annuel, en pourcentage, par durée. Un point creux signale une séance mince, servie à un ou deux soumissionnaires ou non couverte : le chiffre est vrai, il n'est pas représentatif.")}
      </figcaption>
    </figure>
  );
}
