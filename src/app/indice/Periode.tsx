import Link from "next/link";
import { fmtDate, fmtPct } from "@/lib/format";
import type { VueDePeriode } from "@/lib/market/index-period";
import { getT } from "@/i18n/server";
import { ContribBars } from "./note/[trimestre]/Figures";
import { Societes } from "./Societes";
import styles from "./periode.module.css";

/**
 * « SUR LA PÉRIODE » : ce que la note du trimestre montre, calculé sur la période que l'on choisit (8 novembre 2026, option A de « l'indice et la note »).
 *
 * Les graphes et les tableaux sont ceux de la note, par les mêmes figures et le même calcul (`vueDePeriode`) : une seule lecture, deux endroits. Le commentaire reste à la note,
 * qui est un trimestre figé avec sa date de publication ; ici la page est vivante et ne raconte rien.
 */
export const PERIODES = ["1m", "3m", "ytd", "12m", "all"] as const;
export type PeriodeKey = (typeof PERIODES)[number];
export const periodeOuDefaut = (v?: string): PeriodeKey => ((PERIODES as readonly string[]).includes(v ?? "") ? (v as PeriodeKey) : "12m");

/** Le premier jour de la période, d'après la dernière séance lue. */
export function debutDePeriode(p: PeriodeKey, derniere: string): string {
  if (p === "all") return "1900-01-01";
  if (p === "ytd") return `${derniere.slice(0, 4)}-01-01`;
  const jours = p === "1m" ? 30 : p === "3m" ? 91 : 365;
  return new Date(new Date(`${derniere}T12:00:00Z`).getTime() - jours * 86400e3).toISOString().slice(0, 10);
}

const signed = (v: number, d = 1) => {
  const r = Number(v.toFixed(d));
  return `${r > 0 ? "+" : ""}${fmtPct(r === 0 ? 0 : v, d)}`;
};

export async function Periode({ vue, quarterNoteHref }: { vue: VueDePeriode; quarterNoteHref?: string }) {
  const t = await getT();
  const { lines, stats } = vue;
  return (
    <div className={styles.corps} id="periode">
      {quarterNoteHref && (
        <p className={styles.resume}>
          <Link href={quarterNoteHref}>{t("Le commentaire de la période est dans la note du trimestre")} →</Link>
        </p>
      )}
        <figure className={styles.figure}>
          <div className={styles.titre}>{t("Ce que chaque société a apporté à la période")}</div>
          <ContribBars lines={lines} unit={t("points d'indice")} />
          <p className={styles.legende}>{t("La contribution d'une société est son poids en début de période multiplié par la variation de son cours.")}</p>
        </figure>

        <dl className={styles.stats}>
          <div>
            <dt>{t("Repli maximal")}</dt>
            <dd>{signed(stats.drawdown, 1)}</dd>
            <small>{stats.drawdownFrom && stats.drawdownTo ? t("du {a} au {b}", { a: fmtDate(stats.drawdownFrom, false), b: fmtDate(stats.drawdownTo, false) }) : t("sur la période")}</small>
          </div>
          {stats.volAll != null && stats.volMoved != null && (
            <div>
              <dt>{t("Variabilité annualisée")}</dt>
              <dd>
                {fmtPct(stats.volAll, 0)} / {fmtPct(stats.volMoved, 0)}
              </dd>
              <small>{t("toutes les séances / séances avec échange")}</small>
            </div>
          )}
          <div>
            <dt>{t("La finance dans la cote")}</dt>
            <dd>{fmtPct(vue.financePct, 1)}</dd>
            <small>{t("de la capitalisation · au début {d}", { d: fmtPct(vue.financeDebut, 1) })}</small>
          </div>
          {vue.rotation != null && (
            <div>
              <dt>{t("Rotation du flottant")}</dt>
              <dd>{fmtPct(vue.rotation, 1)}</dd>
              <small>{t("sur la période")}</small>
            </div>
          )}
        </dl>

        <Societes societes={vue.societes} capFin={vue.capFin} capFlottantFin={vue.capFlottantFin} />

        <div className={styles.splits}>
          {[
            { titre: t("Par secteur"), rows: vue.bySector },
            { titre: t("Par pays"), rows: vue.byCountry },
          ].map((g) => (
            <div key={g.titre} className={styles.figure}>
              <div className={styles.titre}>{g.titre}</div>
              {g.rows.map((r) => {
                const d = r.fin - r.debut;
                return (
                  <div key={r.label} className={styles.split}>
                    <span>{t(r.label)}</span>
                    <span className={styles.piste}>
                      <i style={{ width: `${Math.max(0, Math.min(100, r.fin))}%` }} />
                      <u style={{ left: `${Math.max(0, Math.min(100, r.debut))}%` }} />
                    </span>
                    <b>
                      {fmtPct(r.fin, 1)} <small className={d > 0.05 ? styles.up : d < -0.05 ? styles.down : ""}>{`${d > 0.05 ? "+" : d < -0.05 ? "−" : ""}${fmtPct(Math.abs(d), 1).replace(" %", "")} pt`}</small>
                    </b>
                  </div>
                );
              })}
            </div>
          ))}
          <p className={styles.legende}>{t("Barre : poids à la fin de la période. Trait : poids au début.")}</p>
        </div>
    </div>
  );
}
