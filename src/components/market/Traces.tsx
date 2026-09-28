"use client";

import { useRef, useState } from "react";
import styles from "./Traces.module.css";

/**
 * Deux tracés pour le dossier d'analyses.
 *
 * Ils n'avaient pas de survol, et l'argument tenait : chaque chiffre qu'ils
 * portaient était dans la table juste en dessous, et un graphique de desk qui
 * exige la souris pour livrer une valeur oblige à cliquer trente fois pour
 * recopier une ligne. Deux choses l'ont défait. Toutes les figures n'ont plus
 * leur table, l'indice et la fraîcheur n'en ayant jamais eu ; et sur une série
 * de deux cent soixante points, lire une date à l'œil entre deux graduations
 * n'est pas une lecture, c'est une estimation.
 *
 * Le survol ajoute donc ce que la table ne donne pas : quel point exactement,
 * et à quelle date. Ce qu'il ne fait pas est de devenir la seule façon d'obtenir
 * un chiffre, et c'est pourquoi les tables restent.
 *
 * La bulle est sombre sur une page claire : elle se détache du tracé au lieu de
 * s'y fondre, et personne ne la prend pour un élément du graphique.
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
const MOIS = ["", "janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const mois = (iso: string) => {
  const [a, m] = iso.split("-");
  return `${MOIS[+m]} ${a.slice(2)}`;
};
const jour = (iso: string) => {
  const [a, m, j] = iso.split("-");
  return `${j} ${MOIS[+m]} ${a}`;
};
const nb = (v: number, d: number) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });

/** La bulle sombre, posée en pour cent pour suivre la figure quelle que soit sa largeur rendue. */
function Bulle({ x, y, titre, lignes, note }: { x: number; y: number; titre: string; lignes: { nom?: string; couleur?: string; valeur: string }[]; note?: string }) {
  return (
    <div className={styles.bulle} style={{ left: `${Math.min(Math.max(x, 2), 72)}%`, top: `${Math.max(2, y)}%` }}>
      <div className={styles.bulleTitre}>{titre}</div>
      {lignes.map((l, i) => (
        <div key={i} className={styles.bulleLigne}>
          <span>
            {l.couleur && <i style={{ background: l.couleur }} aria-hidden="true" />}
            {l.nom}
          </span>
          <b>{l.valeur}</b>
        </div>
      ))}
      {note && <div className={styles.bulleNote}>{note}</div>}
    </div>
  );
}

export interface Trace {
  couleur: string;
  /**
   * Un point creux dit une séance mince : le chiffre est vrai, il n'est pas
   * représentatif. C'est une propriété du point et non une règle à appliquer,
   * et cela compte : un prédicat est une fonction, et une fonction ne traverse
   * pas la frontière serveur/client.
   */
  points: { on: string; v: number; creux?: boolean }[];
  aire?: boolean;
  /** Une série longue se lit mieux sans ses marques : deux cent soixante points font un collier. */
  marques?: boolean;
  /** Le nom porté au bout de la ligne, et dans la bulle. */
  nom?: string;
}

/**
 * Une ou plusieurs séries dans le temps.
 *
 * L'abscisse est la date réelle et non le rang : seize séances réparties sur
 * sept ans ne sont pas seize pas réguliers, et les espacer également ferait
 * croire à une cadence que le marché n'a pas eue.
 */
export function SerieTemps({
  traces,
  height = 200,
  unite = "%",
  decimales = 1,
  ariaLabel,
  reperes = 6,
}: {
  traces: Trace[];
  height?: number;
  unite?: string;
  decimales?: number;
  ariaLabel: string;
  /** Combien de dates porter en abscisse. Deux bornes ne situent rien au milieu. */
  reperes?: number;
}) {
  const boite = useRef<HTMLDivElement | null>(null);
  const [vise, setVise] = useState<{ x: number; y: number; on: string; lignes: { nom?: string; couleur: string; valeur: string }[] } | null>(null);

  const tous = traces.flatMap((t) => t.points);
  const W = 720;
  const H = height;
  if (tous.length < 2) return null;
  const xs = tous.map((p) => Date.parse(p.on));
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const vs = tous.map((p) => p.v);
  const marge = (Math.max(...vs) - Math.min(...vs)) * 0.1 || 1;
  const lo = Math.min(...vs) - marge;
  const hi = Math.max(...vs) + marge;
  const X = (on: string) => P.l + ((Date.parse(on) - x0) / (x1 - x0 || 1)) * (W - P.l - P.r);
  const Y = (v: number) => H - P.b - ((v - lo) / (hi - lo || 1)) * (H - P.t - P.b);

  /** Des repères régulièrement répartis dans le temps, et non les seules bornes. */
  const dates: { x: number; mot: string }[] = [];
  for (let i = 0; i <= reperes; i++) {
    const t = x0 + ((x1 - x0) * i) / reperes;
    dates.push({ x: P.l + (i / reperes) * (W - P.l - P.r), mot: mois(new Date(t).toISOString().slice(0, 10)) });
  }

  const bouger = (e: React.PointerEvent) => {
    const r = boite.current?.getBoundingClientRect();
    if (!r) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    if (px < P.l || px > W - P.r) return setVise(null);
    const quand = x0 + ((px - P.l) / (W - P.l - P.r)) * (x1 - x0);
    // Le point le plus proche dans le temps, série par série.
    const proches = traces
      .map((t) => ({ t, p: t.points.reduce((m, q) => (Math.abs(Date.parse(q.on) - quand) < Math.abs(Date.parse(m.on) - quand) ? q : m)) }))
      .filter((x) => x.p);
    if (!proches.length) return setVise(null);
    const ref = proches.reduce((m, q) => (Math.abs(Date.parse(q.p.on) - quand) < Math.abs(Date.parse(m.p.on) - quand) ? q : m));
    setVise({
      x: (X(ref.p.on) / W) * 100 + 1.5,
      y: (Y(ref.p.v) / H) * 100 - 8,
      on: ref.p.on,
      lignes: proches.map(({ t, p }) => ({ nom: t.nom, couleur: t.couleur, valeur: `${nb(p.v, decimales)}${unite ? ` ${unite}` : ""}` })),
    });
  };

  return (
    <div className={styles.fig} ref={boite} onPointerMove={bouger} onPointerLeave={() => setVise(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className={styles.svg}>
        {ticks(lo, hi).map((v) => (
          <g key={v}>
            <line x1={P.l} y1={Y(v)} x2={W - P.r} y2={Y(v)} className={styles.grille} />
            <text x={P.l - 8} y={Y(v) + 3.5} textAnchor="end" className={styles.tick}>
              {nb(v, decimales)}
              {unite ? ` ${unite}` : ""}
            </text>
          </g>
        ))}
        <path d={`M${P.l} ${P.t}V${H - P.b}H${W - P.r}`} className={styles.axe} />
        {vise && <line x1={X(vise.on)} y1={P.t} x2={X(vise.on)} y2={H - P.b} className={styles.suivi} />}
        {traces.map((t, i) => {
          const pts = [...t.points].sort((a, b) => a.on.localeCompare(b.on));
          const d = pts.map((p) => `${X(p.on).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ");
          return (
            <g key={i}>
              {t.aire && <polygon points={`${P.l},${H - P.b} ${d} ${(W - P.r).toFixed(1)},${H - P.b}`} fill={t.couleur} opacity={0.1} />}
              <polyline points={d} fill="none" stroke={t.couleur} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {t.marques !== false && pts.map((p) => <circle key={p.on + p.v} cx={X(p.on)} cy={Y(p.v)} r={3.2} fill={p.creux ? "var(--surface)" : t.couleur} stroke={t.couleur} strokeWidth={2} />)}
              {/* Le nom au bout de la ligne : l'œil est déjà là, il n'a pas à repartir vers une légende. */}
              {t.nom && (
                <text x={X(pts[pts.length - 1].on) - 4} y={Y(pts[pts.length - 1].v) - 8} textAnchor="end" className={styles.nom} fill={t.couleur}>
                  {t.nom}
                </text>
              )}
            </g>
          );
        })}
        {dates.map((d, i) => (
          <text key={i} x={d.x} y={H - 8} textAnchor={i === 0 ? "start" : i === dates.length - 1 ? "end" : "middle"} className={styles.tick}>
            {d.mot}
          </text>
        ))}
      </svg>
      {vise && <Bulle x={vise.x} y={vise.y} titre={jour(vise.on)} lignes={vise.lignes} />}
    </div>
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
  seuilMot,
  height = 180,
  unite = "×",
  decimales = 1,
  ariaLabel,
}: {
  points: { v: number; couleur: string; on: string }[];
  /** Le trait qui sépare deux régimes : sous cent pour cent, le Trésor n'a pas trouvé preneur. */
  seuil?: number;
  /** Ce que ce trait veut dire, écrit dessus : sans cela il faut compter les graduations. */
  seuilMot?: string;
  height?: number;
  unite?: string;
  decimales?: number;
  ariaLabel: string;
}) {
  const boite = useRef<HTMLDivElement | null>(null);
  const [vise, setVise] = useState<number | null>(null);

  const W = 720;
  const H = height;
  if (!points.length) return null;
  const hi = Math.max(...points.map((p) => p.v), seuil ?? 0) * 1.08;
  const pas = (W - P.l - P.r) / points.length;
  const bw = Math.max(2, pas - 2);
  const Y = (v: number) => H - P.b - (v / (hi || 1)) * (H - P.t - P.b);

  const ans = [...new Set(points.map((p) => p.on.slice(0, 4)))];
  let dernier = -99;

  const bouger = (e: React.PointerEvent) => {
    const r = boite.current?.getBoundingClientRect();
    if (!r) return;
    const i = Math.floor((((e.clientX - r.left) / r.width) * W - P.l) / pas);
    setVise(i >= 0 && i < points.length ? i : null);
  };

  return (
    <div className={styles.fig} ref={boite} onPointerMove={bouger} onPointerLeave={() => setVise(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className={styles.svg}>
        {ticks(0, hi)
          .filter((v) => v !== seuil)
          .map((v) => (
            <g key={v}>
              <line x1={P.l} y1={Y(v)} x2={W - P.r} y2={Y(v)} className={styles.grille} />
              <text x={P.l - 8} y={Y(v) + 3.5} textAnchor="end" className={styles.tick}>
                {nb(v, decimales)}
                {unite}
              </text>
            </g>
          ))}
        <path d={`M${P.l} ${P.t}V${H - P.b}H${W - P.r}`} className={styles.axe} />
        {points.map((p, i) => (
          <rect key={i} x={P.l + i * pas + 1} y={Y(p.v)} width={bw} height={Math.max(0, H - P.b - Y(p.v))} rx={2} fill={p.couleur} opacity={vise == null || vise === i ? 0.92 : 0.45} />
        ))}
        {/* Le seuil par-dessus les barres : c'est lui qui sépare deux régimes, et
            une grille pâle derrière les données ne se voit pas. */}
        {seuil != null && (
          <g>
            <line x1={P.l} y1={Y(seuil)} x2={W - P.r} y2={Y(seuil)} className={styles.seuil} />
            <text x={W - P.r} y={Y(seuil) - 6} textAnchor="end" className={styles.seuilMot}>
              {seuilMot ?? `${nb(seuil, decimales)}${unite}`}
            </text>
          </g>
        )}
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
      {vise != null && (
        <Bulle
          x={((P.l + vise * pas + bw / 2) / W) * 100 + 1.5}
          y={(Y(points[vise].v) / H) * 100 - 8}
          titre={jour(points[vise].on)}
          lignes={[{ couleur: points[vise].couleur, valeur: `${nb(points[vise].v, decimales)}${unite}` }]}
          note={seuil != null ? (points[vise].v < seuil ? seuilMot && `sous le seuil` : undefined) : undefined}
        />
      )}
    </div>
  );
}
