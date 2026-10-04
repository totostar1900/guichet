"use client";

import { useMemo, useState } from "react";
import { useT } from "@/i18n/client";
import styles from "./YieldRange.module.css";

/**
 * LA DURÉE COMME JAUGE, et non comme trois cases à cocher.
 *
 * La page des titres filtre la durée par paliers — moins d'un an, un à trois
 * ans, plus de trois — et cela lui va : une cote mêle des bons, des
 * obligations longues et des actions, donc trois paniers de nature
 * différente. À l'adjudication il n'y a que des emprunts d'État, et ce qui
 * sépare deux séances est le nombre d'années, pas la famille. « Entre deux et
 * cinq ans » n'est pas disable en paliers ; il se montre sur une règle.
 *
 * C'est donc la jauge du rendement, avec ses barres, ses deux curseurs et ses
 * raccourcis : même objet à l'écran, même geste à apprendre, et sa feuille de
 * style. Seules changent l'unité, les bornes et les raccourcis — on ne
 * raisonne pas en quarts de pour cent sur des années.
 *
 * LES MOINS D'UN AN SE LISENT EN MOIS. Un bon du Trésor dure treize, vingt-six
 * ou cinquante-deux semaines : « 0,2 an » ne dit rien à personne, « 3 mois »
 * dit tout.
 */
export function parseDureeRange(v: string | null): { min?: number; max?: number } {
  if (!v) return {};
  const [a, b] = v.split("-");
  const min = a ? Number(a.replace(",", ".")) : undefined;
  const max = b ? Number(b.replace(",", ".")) : undefined;
  return { min: min != null && !isNaN(min) ? min : undefined, max: max != null && !isNaN(max) ? max : undefined };
}
export const dureeRangeParam = (min?: number, max?: number): string | undefined => (min == null && max == null ? undefined : `${min ?? ""}-${max ?? ""}`.replace(/-$/, ""));

/** « 3 mois », « 2 ans », « 2,5 ans » : les mois sous l'année, les années au-dessus. */
export function dureeTexte(ans: number): string {
  if (ans < 1) {
    const mois = Math.max(1, Math.round(ans * 12));
    return `${mois} mois`;
  }
  const arrondi = Math.round(ans * 10) / 10;
  return `${String(arrondi).replace(".", ",")} ${arrondi > 1 ? "ans" : "an"}`;
}
export const dureeRangeLabel = (r: { min?: number; max?: number }): string =>
  r.min != null && r.max != null ? `${dureeTexte(r.min)} – ${dureeTexte(r.max)}` : r.min != null ? `≥ ${dureeTexte(r.min)}` : r.max != null ? `≤ ${dureeTexte(r.max)}` : "";

const PAS = 0.25;
const CASES = 24;

export function DureeGauge({ values, min, max, onChange }: { values: number[]; min?: number; max?: number; onChange: (min?: number, max?: number) => void }) {
  const t = useT();
  const bas = 0;
  const haut = Math.max(1, Math.ceil(Math.max(1, ...values)));
  const cases = useMemo(() => {
    const out = new Array(CASES).fill(0);
    for (const v of values) out[Math.min(CASES - 1, Math.max(0, Math.floor(((v - bas) / (haut - bas)) * CASES)))]++;
    return out;
  }, [values, haut]);
  const cime = Math.max(1, ...cases);
  const a = min ?? bas;
  const b = max ?? haut;
  // L'état local pendant qu'on tire ; l'adresse ne change qu'au relâchement.
  const [tire, setTire] = useState<{ a: number; b: number } | null>(null);
  const cur = tire ?? { a, b };
  const poser = (na: number, nb: number) => {
    setTire(null);
    onChange(na > bas ? na : undefined, nb < haut ? nb : undefined);
  };
  const pct = (v: number) => ((v - bas) / (haut - bas)) * 100;
  /* Les raccourcis sont ceux des Trésors de la zone : les bons tiennent dans
     l'année, les obligations se font à trois, cinq et sept ans. */
  const raccourcis: [string, number | undefined, number | undefined][] = [
    [t("Tout"), undefined, undefined],
    [t("Moins d'un an"), undefined, 1],
    [t("1 à 3 ans"), 1, 3],
    [t("3 à 7 ans"), 3, 7],
    [t("Plus de 7 ans"), 7, undefined],
  ];
  const compte = values.filter((v) => v >= cur.a && v <= cur.b).length;
  return (
    <div className={styles.gauge}>
      <div className={styles.bars} aria-hidden="true">
        {cases.map((n, i) => {
          const x0 = bas + (i / CASES) * (haut - bas);
          const x1 = bas + ((i + 1) / CASES) * (haut - bas);
          const dedans = x1 > cur.a && x0 < cur.b + 1e-9;
          return <i key={i} style={{ height: `${Math.max(6, (n / cime) * 100)}%` }} className={dedans ? styles.on : undefined} />;
        })}
      </div>
      <div className={styles.slider}>
        <div className={styles.track}>
          <div className={styles.fill} style={{ left: `${pct(cur.a)}%`, width: `${pct(cur.b) - pct(cur.a)}%` }} />
        </div>
        <input type="range" min={bas} max={haut} step={PAS} value={cur.a} aria-label={t("Durée minimum")} onChange={(e) => setTire({ a: Math.min(Number(e.target.value), cur.b), b: cur.b })} onPointerUp={() => poser(cur.a, cur.b)} onKeyUp={() => poser(cur.a, cur.b)} onBlur={() => tire && poser(cur.a, cur.b)} />
        <input type="range" min={bas} max={haut} step={PAS} value={cur.b} aria-label={t("Durée maximum")} onChange={(e) => setTire({ a: cur.a, b: Math.max(Number(e.target.value), cur.a) })} onPointerUp={() => poser(cur.a, cur.b)} onKeyUp={() => poser(cur.a, cur.b)} onBlur={() => tire && poser(cur.a, cur.b)} />
      </div>
      <div className={styles.read}>
        <b>
          {t(dureeTexte(cur.a))} – {t(dureeTexte(cur.b))}
        </b>
        <small>
          {compte} {t(compte > 1 ? "lignes" : "ligne")}
        </small>
      </div>
      <div className={styles.presets}>
        {raccourcis.map(([l, pa, pb]) => {
          const on = (pa ?? bas) === a && (pb ?? haut) === b;
          return (
            <button key={l} type="button" className={on ? styles.presetOn : undefined} aria-pressed={on} onClick={() => poser(pa ?? bas, pb ?? haut)}>
              {l}
            </button>
          );
        })}
      </div>
    </div>
  );
}
