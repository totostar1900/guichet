import styles from "./Traces.module.css";

/**
 * Deux tracés, rendus par le serveur, pour le dossier d'analyses.
 *
 * Ils n'ont pas de survol et n'en veulent pas : ce sont des figures qu'on lit,
 * pas des instruments qu'on interroge, et chaque chiffre qu'elles portent est
 * dans la table juste en dessous. Un graphique de desk qui exige la souris
 * pour livrer une valeur oblige à cliquer trente fois pour recopier une ligne.
 *
 * Aucune bibliothèque : deux axes, une polyligne, des barres. Charger cent
 * cinquante kilooctets pour cela coûterait plus cher que tout ce qu'on y
 * gagnerait.
 */

const P = { l: 52, r: 14, t: 14, b: 26 };

function ticks(min: number, max: number, n = 4): number[] {
  if (max === min) return [min];
  const brut = (max - min) / n;
  const p = 10 ** Math.floor(Math.log10(brut));
  const pas = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= brut) ?? brut;
  const out: number[] = [];
  for (let v = Math.floor(min / pas) * pas; v <= max + pas / 2; v += pas) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}
const mois = (iso: string) => {
  const [a, m] = iso.split("-");
  return `${["", "janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."][+m]} ${a.slice(2)}`;
};

export interface Trace {
  couleur: string;
  points: { on: string; v: number }[];
  /** Un point creux : la séance est mince, le chiffre est vrai mais pas représentatif. */
  creux?: (p: { on: string; v: number }) => boolean;
  aire?: boolean;
  /** Une série longue se lit mieux sans ses marques : deux cent soixante points font un collier. */
  marques?: boolean;
}

/**
 * Une ou plusieurs séries dans le temps.
 *
 * L'abscisse est la date réelle et non le rang : seize séances réparties sur
 * sept ans ne sont pas seize pas réguliers, et les espacer également ferait
 * croire à une cadence que le marché n'a pas eue.
 */
export function SerieTemps({ traces, height = 200, unite = "%", decimales = 1, ariaLabel }: { traces: Trace[]; height?: number; unite?: string; decimales?: number; ariaLabel: string }) {
  const tous = traces.flatMap((t) => t.points);
  if (tous.length < 2) return null;
  const W = 720;
  const H = height;
  const xs = tous.map((p) => Date.parse(p.on));
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const vs = tous.map((p) => p.v);
  const marge = (Math.max(...vs) - Math.min(...vs)) * 0.1 || 1;
  const lo = Math.min(...vs) - marge;
  const hi = Math.max(...vs) + marge;
  const X = (on: string) => P.l + ((Date.parse(on) - x0) / (x1 - x0 || 1)) * (W - P.l - P.r);
  const Y = (v: number) => H - P.b - ((v - lo) / (hi - lo || 1)) * (H - P.t - P.b);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className={styles.svg}>
      {ticks(lo, hi).map((v) => (
        <g key={v}>
          <line x1={P.l} y1={Y(v)} x2={W - P.r} y2={Y(v)} className={styles.grille} />
          <text x={P.l - 8} y={Y(v) + 3.5} textAnchor="end" className={styles.tick}>
            {v.toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}
            {unite ? ` ${unite}` : ""}
          </text>
        </g>
      ))}
      <path d={`M${P.l} ${P.t}V${H - P.b}H${W - P.r}`} className={styles.axe} />
      {traces.map((t, i) => {
        const pts = [...t.points].sort((a, b) => a.on.localeCompare(b.on));
        const d = pts.map((p) => `${X(p.on).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ");
        return (
          <g key={i}>
            {t.aire && <polygon points={`${P.l},${H - P.b} ${d} ${(W - P.r).toFixed(1)},${H - P.b}`} fill={t.couleur} opacity={0.1} />}
            <polyline points={d} fill="none" stroke={t.couleur} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {t.marques !== false &&
              pts.map((p) => (
                <circle key={p.on + p.v} cx={X(p.on)} cy={Y(p.v)} r={3.2} fill={t.creux?.(p) ? "var(--surface)" : t.couleur} stroke={t.couleur} strokeWidth={2} />
              ))}
          </g>
        );
      })}
      <text x={P.l} y={H - 8} className={styles.tick}>
        {mois(tous.reduce((a, b) => (a.on < b.on ? a : b)).on)}
      </text>
      <text x={W - P.r} y={H - 8} textAnchor="end" className={styles.tick}>
        {mois(tous.reduce((a, b) => (a.on > b.on ? a : b)).on)}
      </text>
    </svg>
  );
}

/**
 * Une barre par observation, dans l'ordre.
 *
 * L'abscisse compte les observations et ne mesure pas le temps : c'est dit sous
 * la figure, parce qu'une barre par séance sur sept ans, régulièrement
 * espacée, ferait croire à une cadence régulière.
 */
export function Barres({
  points,
  seuil,
  height = 180,
  unite = "×",
  decimales = 1,
  ariaLabel,
}: {
  points: { v: number; couleur: string; on: string }[];
  seuil?: number;
  height?: number;
  unite?: string;
  decimales?: number;
  ariaLabel: string;
}) {
  if (!points.length) return null;
  const W = 720;
  const H = height;
  const hi = Math.max(...points.map((p) => p.v), seuil ?? 0) * 1.08;
  const pas = (W - P.l - P.r) / points.length;
  const bw = Math.max(2, pas - 2);
  const Y = (v: number) => H - P.b - (v / (hi || 1)) * (H - P.t - P.b);

  const ans = [...new Set(points.map((p) => p.on.slice(0, 4)))];
  let dernier = -99;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className={styles.svg}>
      {ticks(0, hi).map((v) => (
        <g key={v}>
          <line x1={P.l} y1={Y(v)} x2={W - P.r} y2={Y(v)} className={v === seuil ? styles.seuil : styles.grille} />
          <text x={P.l - 8} y={Y(v) + 3.5} textAnchor="end" className={styles.tick}>
            {v.toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}
            {unite}
          </text>
        </g>
      ))}
      <path d={`M${P.l} ${P.t}V${H - P.b}H${W - P.r}`} className={styles.axe} />
      {points.map((p, i) => (
        <rect key={i} x={P.l + i * pas + 1} y={Y(p.v)} width={bw} height={Math.max(0, H - P.b - Y(p.v))} rx={2} fill={p.couleur} opacity={0.85} />
      ))}
      {ans.map((a) => {
        const i = points.findIndex((p) => p.on.startsWith(a));
        const x = P.l + i * pas;
        if (x - dernier < 34) return null;
        dernier = x;
        return (
          <text key={a} x={x} y={H - 8} className={styles.tick}>
            {a}
          </text>
        );
      })}
    </svg>
  );
}
