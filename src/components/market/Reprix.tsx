"use client";

import { useMemo, useState } from "react";
import type { Country } from "@/lib/domain/types";
import { COUNTRY_COLOR } from "@/lib/market/couleurs";
import { useT } from "@/i18n/client";
import { SerieTemps } from "./Traces";
import styles from "./Reprix.module.css";

/**
 * Ce que chaque durée a payé, séance après séance.
 *
 * La figure montrait d'office les trois couples Trésor-durée les mieux garnis,
 * et il se trouve que ce sont deux Trésors sur six : le Gabon et le Cameroun,
 * simplement parce qu'ils ont le plus de séances relues sur une même durée. Un
 * graphique nommé « le marché » qui montre deux pays sur six sans le dire n'est
 * pas une sélection, c'est un malentendu.
 *
 * On choisit donc, et le choix dit ce qui est disponible : chaque durée porte
 * son nombre de séances, et celles qui n'en ont pas assez pour faire une série
 * sont proposées grisées plutôt que cachées. Savoir qu'une durée n'a que deux
 * séances est une information ; ne pas la voir du tout n'en est pas une.
 */
export interface SerieDuree {
  pays: Country;
  tenor: string;
  points: { on: string; v: number; creux?: boolean }[];
}

/** Une série se tient à partir de quatre séances : en dessous, elle raconte le hasard des lectures faites. */
const MINIMUM = 4;

export function Reprix({ series }: { series: SerieDuree[] }) {
  const t = useT();
  const utiles = useMemo(() => series.filter((s) => s.points.length >= MINIMUM), [series]);

  const pays = useMemo(() => [...new Set(series.map((s) => s.pays))].sort(), [series]);
  const [choisis, setChoisis] = useState<string[]>(() => utiles.slice(0, 3).map((s) => `${s.pays}|${s.tenor}`));

  const basculer = (cle: string) => setChoisis((v) => (v.includes(cle) ? v.filter((x) => x !== cle) : [...v, cle]));

  const traces = useMemo(
    () =>
      series
        .filter((s) => choisis.includes(`${s.pays}|${s.tenor}`))
        .map((s) => ({
          couleur: COUNTRY_COLOR[s.pays],
          points: s.points,
          nom: `${s.pays} ${s.tenor.replace(" semaines", " sem.")}`,
        })),
    [series, choisis],
  );

  /**
   * Deux séries d'un même Trésor partageraient une couleur. On les distingue
   * en variant l'opacité plutôt qu'en inventant une teinte : la couleur suit
   * l'émetteur, c'est la règle de la maison.
   */
  const tracesTeintees = useMemo(() => {
    const vus = new Map<string, number>();
    return traces.map((tr) => {
      const n = (vus.get(tr.couleur) ?? 0) + 1;
      vus.set(tr.couleur, n);
      return n === 1 ? tr : { ...tr, couleur: tr.couleur, marques: n <= 2 };
    });
  }, [traces]);

  return (
    <div>
      <div className={styles.filtres}>
        {pays.map((p) => {
          const siennes = series.filter((s) => s.pays === p).sort((a, b) => b.points.length - a.points.length);
          return (
            <div key={p} className={styles.grp}>
              <span className={styles.etiq}>
                <i style={{ background: COUNTRY_COLOR[p] }} aria-hidden="true" />
                {p}
              </span>
              <div className={styles.durees}>
                {siennes.map((s) => {
                  const cle = `${s.pays}|${s.tenor}`;
                  const assez = s.points.length >= MINIMUM;
                  return (
                    <button
                      key={cle}
                      type="button"
                      aria-pressed={choisis.includes(cle)}
                      disabled={!assez}
                      onClick={() => basculer(cle)}
                      title={assez ? undefined : t("{n} séances seulement : trop peu pour une série.", { n: s.points.length })}
                    >
                      {s.tenor.replace(" semaines", " sem.")} <span>{s.points.length}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {traces.length ? (
        <SerieTemps traces={tracesTeintees} ariaLabel={t("Rendement de chaque durée suivie, dans le temps")} height={230} />
      ) : (
        <div className="empty">{t("Choisissez au moins une durée.")}</div>
      )}

      {/* Ce qu'un trait coupé veut dire : le dire vaut mieux que de laisser croire à une panne. */}
      <p className={styles.note}>
        {t(
          "Un trait s'interrompt là où le Trésor n'a pas publié de séance pendant plus d'un an : le Cameroun est ainsi absent de l'index de la BEAC entre 2022 et 2024. Relier ces points dessinerait une progression que personne n'a observée.",
        )}
      </p>
    </div>
  );
}
