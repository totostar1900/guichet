"use client";

import { useState } from "react";
import { useDates, useT } from "@/i18n/client";
import { fmtPct } from "@/lib/format";
import styles from "./ComparatifDesSeances.module.css";

export interface PointDeCourbe {
  id: string;
  le: string;
  niveau?: number;
  bas?: number;
  haut?: number;
  coupon?: number;
  rendement?: number;
}

type Mesure = "niveau" | "coupon" | "rendement";

/**
 * LA COURBE DES SÉANCES : AXES, VOTRE LIMITE ÉTIQUETÉE, FOURCHETTE SUR LA COURBE (3 novembre 2026).
 *
 * « Rajouter des axes à la courbe, rajouter votre prix max 95. » L'axe des valeurs porte ses
 * graduations, l'axe du temps ses années, et la ligne de la limite son étiquette (« votre prix max
 * 95 % »). La fourchette min–max de chaque séance est dessinée sur la courbe : la frise séparée,
 * qui disait la même chose, est partie.
 *
 * UNE FIGURE, TROIS LECTURES : le sélecteur de mesure change ce qu'on regarde — le prix (ou le taux
 * d'un bon), le coupon, le rendement — et la limite change avec lui. Le coupon est fixé par le
 * Trésor à l'émission : il avance par paliers, et la courbe le dit en marches.
 *
 * LE NUAGE COUPON × PRIX EST TOUJOURS SOUS LA COURBE (3 novembre 2026 : « ne plus masquer le graphe
 * nuage ») : un point par séance, et le quadrant de vos deux limites.
 */
export function CourbeDesSeances({
  points,
  unite,
  limite,
  limiteCoupon,
  limiteRendement,
  role,
}: {
  points: PointDeCourbe[];
  unite: "prix" | "taux";
  limite?: number;
  limiteCoupon?: number;
  limiteRendement?: number;
  role: "question" | "attente";
}) {
  const t = useT();
  const [mesure, setMesure] = useState<Mesure>("niveau");

  const chrono = [...points].reverse();
  const dispo: { m: Mesure; nom: string }[] = [
    { m: "niveau", nom: t(unite === "prix" ? "Prix" : "Taux") },
    ...(unite === "prix" && chrono.some((p) => p.coupon != null) ? [{ m: "coupon" as const, nom: t("Coupon") }] : []),
    ...(chrono.some((p) => p.rendement != null) ? [{ m: "rendement" as const, nom: t("Rendement") }] : []),
  ];
  const active = dispo.some((d) => d.m === mesure) ? mesure : "niveau";
  const valeurDe = (p: PointDeCourbe) => (active === "niveau" ? p.niveau : active === "coupon" ? p.coupon : p.rendement);
  const serie = chrono.filter((p) => valeurDe(p) != null);
  const lim = active === "niveau" ? limite : active === "coupon" ? limiteCoupon : limiteRendement;
  const etiquetteLimite =
    lim == null
      ? undefined
      : t(role === "question" ? "niveau indicatif {v}" : active === "niveau" ? (unite === "prix" ? "votre prix max {v}" : "votre taux min {v}") : active === "coupon" ? "votre coupon min {v}" : "votre rendement {v}", {
          v: active === "rendement" ? `≈ ${fmtPct(lim, 1)}` : fmtPct(lim, Number.isInteger(lim) ? 0 : 2),
        });
  const titre = active === "niveau" ? t(unite === "prix" ? "Prix servi · moyen et fourchette" : "Taux servi · moyen et fourchette") : active === "coupon" ? t("Coupon des lignes adjugées") : t("Rendement moyen servi");

  if (serie.length < 2 && !(serie.length === 1 && lim != null)) return null;
  const peutNuage = unite === "prix" && chrono.filter((p) => p.coupon != null && p.niveau != null).length >= 2;

  return (
    <div className={styles.bloc}>
      {dispo.length > 1 && (
        <div className={styles.segment} role="group" aria-label={t("Mesure")}>
          {dispo.map((d) => (
            <button key={d.m} type="button" aria-pressed={active === d.m} onClick={() => setMesure(d.m)}>
              {d.nom}
            </button>
          ))}
        </div>
      )}
      <h3 className={styles.sous}>{titre}</h3>
      <Graphique serie={serie.map((p) => ({ id: p.id, le: p.le, v: valeurDe(p)!, bas: active === "niveau" ? p.bas : undefined, haut: active === "niveau" ? p.haut : undefined }))} limite={lim} etiquette={etiquetteLimite} marches={active === "coupon"} decimales={active === "niveau" && unite === "prix" ? 0 : 1} />
      <p className={styles.legende}>{active === "niveau" ? t("Barre claire : fourchette min–max de la séance.") : t("Un point par séance.")}</p>
      {peutNuage && <Nuage points={chrono.filter((p) => p.coupon != null && p.niveau != null)} limitePrix={limite} limiteCoupon={limiteCoupon} />}
    </div>
  );
}

const W = 358;
const H = 200;
const G = 40;
const D = 12;
const BAS = 28;
const HAUT = 16;

const jour = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

/** Des graduations rondes : quatre ou cinq, du plus bas au plus haut. */
function graduations(lo: number, hi: number): number[] {
  const brut = (hi - lo) / 4 || 1;
  const p = 10 ** Math.floor(Math.log10(brut));
  const pas = [1, 2, 5, 10].map((k) => k * p).find((k) => k >= brut) ?? brut;
  const out: number[] = [];
  for (let v = Math.ceil(lo / pas) * pas; v <= hi + 1e-9; v += pas) out.push(Math.round(v * 1000) / 1000);
  return out;
}

function Graphique({ serie, limite, etiquette, marches, decimales }: { serie: { id: string; le: string; v: number; bas?: number; haut?: number }[]; limite?: number; etiquette?: string; marches: boolean; decimales: number }) {
  const { fmtDate } = useDates();
  const valeurs = [...serie.flatMap((s) => [s.v, s.bas, s.haut].filter((x): x is number => x != null)), ...(limite != null ? [limite] : [])];
  const marge = (Math.max(...valeurs) - Math.min(...valeurs)) * 0.12 || 1;
  const lo = Math.min(...valeurs) - marge;
  const hi = Math.max(...valeurs) + marge;
  const t0 = jour(serie[0].le);
  const t1 = jour(serie[serie.length - 1].le);
  const etendue = Math.max(t1 - t0, 86_400_000 * 30);
  const X = (iso: string) => G + ((jour(iso) - t0) / etendue) * (W - G - D);
  const Y = (v: number) => HAUT + (1 - (v - lo) / (hi - lo)) * (H - HAUT - BAS);
  const f = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(Math.max(decimales, 1)).replace(".", ","));

  const annees: number[] = [];
  for (let a = new Date(t0).getUTCFullYear(); a <= new Date(t0 + etendue).getUTCFullYear(); a++) if (jour(`${a}-01-01`) >= t0 - 86_400_000 * 90 && jour(`${a}-01-01`) <= t0 + etendue) annees.push(a);

  let ligne = serie.map((s) => `${X(s.le).toFixed(1)},${Y(s.v).toFixed(1)}`).join(" ");
  if (marches) {
    const pp: string[] = [];
    serie.forEach((s, i) => {
      if (i > 0) pp.push(`${X(s.le).toFixed(1)},${Y(serie[i - 1].v).toFixed(1)}`);
      pp.push(`${X(s.le).toFixed(1)},${Y(s.v).toFixed(1)}`);
    });
    ligne = pp.join(" ");
  }
  const yl = limite != null ? Y(limite) : undefined;
  const largeur = etiquette ? etiquette.length * 5.4 + 12 : 0;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.courbe} role="img" aria-label={etiquette ?? ""}>
      {graduations(lo, hi).map((v) => (
        <g key={v}>
          <line x1={G} x2={W - D} y1={Y(v)} y2={Y(v)} className={styles.grille} />
          <text x={G - 6} y={Y(v) + 3.5} textAnchor="end" className={styles.graduation}>
            {f(v)}
          </text>
        </g>
      ))}
      {annees.map((a) => (
        <text key={a} x={Math.min(Math.max(X(`${a}-01-01`), G), W - D)} y={H - 8} textAnchor="middle" className={styles.graduation}>
          {a}
        </text>
      ))}
      {annees.length === 0 &&
        (serie.length === 1 ? (
          <text x={X(serie[0].le)} y={H - 8} textAnchor="middle" className={styles.graduation}>
            {fmtDate(serie[0].le)}
          </text>
        ) : (
          <>
            <text x={G} y={H - 8} className={styles.graduation}>
              {fmtDate(serie[0].le)}
            </text>
            <text x={W - D} y={H - 8} textAnchor="end" className={styles.graduation}>
              {fmtDate(serie[serie.length - 1].le)}
            </text>
          </>
        ))}
      {serie.map((s) =>
        s.bas != null && s.haut != null ? <rect key={`b${s.id}`} x={X(s.le) - 4} y={Y(s.haut)} width={8} height={Math.max(3, Y(s.bas) - Y(s.haut))} rx={4} className={styles.fourchette} /> : null,
      )}
      {yl != null && <line x1={G} x2={W - D} y1={yl} y2={yl} className={styles.trait} />}
      <polyline fill="none" className={styles.ligne} points={ligne} />
      {serie.map((s, i) => (
        <g key={s.id}>
          <circle cx={X(s.le)} cy={Y(s.v)} r={3.5} className={styles.point} />
          {(i === 0 || i === serie.length - 1) && (
            <text x={X(s.le) + (i === 0 ? 6 : -6)} y={Y(s.v) - 8} textAnchor={i === 0 ? "start" : "end"} className={styles.valeur}>
              {s.v.toFixed(2).replace(".", ",")}
            </text>
          )}
        </g>
      ))}
      {yl != null && etiquette && (
        <>
          <rect x={G + 4} y={yl - 19} width={largeur} height={16} rx={4} className={styles.puce} />
          <text x={G + 10} y={yl - 7.5} className={styles.puceTexte}>
            {etiquette}
          </text>
        </>
      )}
    </svg>
  );
}

/** Le nuage : un point par séance, le coupon en abscisse et le prix en ordonnée ; vos deux limites en quadrant. */
function Nuage({ points, limitePrix, limiteCoupon }: { points: PointDeCourbe[]; limitePrix?: number; limiteCoupon?: number }) {
  const t = useT();
  const cs = [...points.map((p) => p.coupon!), ...(limiteCoupon != null ? [limiteCoupon] : [])];
  const ps = [...points.map((p) => p.niveau!), ...(limitePrix != null ? [limitePrix] : [])];
  const mc = (Math.max(...cs) - Math.min(...cs)) * 0.15 || 0.5;
  const mp = (Math.max(...ps) - Math.min(...ps)) * 0.15 || 1;
  const c0 = Math.min(...cs) - mc;
  const c1 = Math.max(...cs) + mc;
  const p0 = Math.min(...ps) - mp;
  const p1 = Math.max(...ps) + mp;
  const X = (c: number) => G + ((c - c0) / (c1 - c0)) * (W - G - D);
  const Y = (p: number) => HAUT + (1 - (p - p0) / (p1 - p0)) * (H - HAUT - BAS);
  /* Deux séances de la même année au même coupon n'écrivent leur année qu'une fois : sinon les étiquettes se recouvrent. */
  const deja = new Set<string>();
  const etiquette = (p: PointDeCourbe): string | undefined => {
    const k = `${p.coupon}-${p.le.slice(0, 4)}`;
    if (deja.has(k)) return undefined;
    deja.add(k);
    return p.le.slice(0, 4);
  };
  return (
    <div className={styles.bloc}>
      <h3 className={styles.sous}>{t("Coupon en abscisse · prix en ordonnée")}</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.courbe} role="img" aria-label={t("Nuage coupon × prix")}>
        {graduations(p0, p1).map((v) => (
          <g key={v}>
            <line x1={G} x2={W - D} y1={Y(v)} y2={Y(v)} className={styles.grille} />
            <text x={G - 6} y={Y(v) + 3.5} textAnchor="end" className={styles.graduation}>
              {Number.isInteger(v) ? v : v.toFixed(1).replace(".", ",")}
            </text>
          </g>
        ))}
        {graduations(c0, c1).map((v) => (
          <text key={`c${v}`} x={X(v)} y={H - 8} textAnchor="middle" className={styles.graduation}>
            {Number.isInteger(v) ? v : v.toFixed(1).replace(".", ",")} %
          </text>
        ))}
        {limitePrix != null && limiteCoupon != null && <rect x={X(limiteCoupon)} y={Y(limitePrix)} width={W - D - X(limiteCoupon)} height={H - BAS - Y(limitePrix)} className={styles.zone} />}
        {limiteCoupon != null && <line x1={X(limiteCoupon)} x2={X(limiteCoupon)} y1={HAUT} y2={H - BAS} className={styles.trait} />}
        {limitePrix != null && <line x1={G} x2={W - D} y1={Y(limitePrix)} y2={Y(limitePrix)} className={styles.trait} />}
        {points.map((p) => (
          <g key={p.id}>
            <circle cx={X(p.coupon!)} cy={Y(p.niveau!)} r={4} className={styles.point} />
            <text x={X(p.coupon!) + 7} y={Y(p.niveau!) + 3} className={styles.valeur}>
              {etiquette(p)}
            </text>
          </g>
        ))}
      </svg>
      <p className={styles.legende}>{limitePrix != null && limiteCoupon != null ? t("Le quadrant teinté réunit vos deux limites : coupon au moins égal, prix au plus égal.") : t("Un point par séance.")}</p>
    </div>
  );
}
