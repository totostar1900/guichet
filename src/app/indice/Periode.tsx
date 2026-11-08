import Link from "next/link";
import { fmt, fmtDate, fmtPct, money } from "@/lib/format";
import type { VueDePeriode } from "@/lib/market/index-period";
import { getT } from "@/i18n/server";
import { ContribBars } from "./note/[trimestre]/Figures";
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
      <p className={styles.resume}>
        <b>{t("Sur la période")}</b> · {t("du {a} au {b}", { a: fmtDate(vue.from), b: fmtDate(vue.to) })} {" "}
        {t("{s} séances lues, dont {m} avec mouvement : l'indice fait {r} sur la période.", { s: String(vue.sessions), m: String(vue.moved), r: signed(vue.ret, 2) })}{" "}
        {quarterNoteHref ? <Link href={quarterNoteHref}>{t("Le commentaire est dans la note du trimestre")} →</Link> : null}
      </p>
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
            <small>{t("de la capitalisation")}</small>
          </div>
          {vue.rotation != null && (
            <div>
              <dt>{t("Rotation du flottant")}</dt>
              <dd>{fmtPct(vue.rotation, 1)}</dd>
              <small>{t("sur douze mois")}</small>
            </div>
          )}
        </dl>

        <div className={styles.figure}>
          <div className={styles.titre}>{t("Les sociétés de la cote sur la période")}</div>
          <div className={styles.tableau}>
          <table>
            <thead>
              <tr>
                <th>{t("Société")}</th>
                <th>{t("Activité")}</th>
                <th>{t("Pays")}</th>
                <th className={styles.num}>{t("Cours")}</th>
                <th className={styles.num}>{t("Rendement")}</th>
                <th className={styles.num}>{t("Poids")}</th>
                <th className={styles.num}>{t("Période")}</th>
                <th className={styles.num}>{t("Échangé")}</th>
                <th className={styles.num}>{t("Transactions")}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.mnemo}>
                  <td>
                    <Link href={`/societes/${l.mnemo.toLowerCase()}`}>
                      <b>{l.mnemo}</b> · {l.name}
                    </Link>
                  </td>
                  <td>{t(l.sector)}</td>
                  <td>{t(l.country)}</td>
                  <td className={styles.num}>{fmt(l.price)}</td>
                  <td className={styles.num}>{l.yield != null ? fmtPct(l.yield, 1) : "—"}</td>
                  <td className={styles.num}>{fmtPct(l.weight, 1)}</td>
                  <td className={`${styles.num} ${l.move > 0 ? styles.up : l.move < 0 ? styles.down : ""}`}>{signed(l.move)}</td>
                  <td className={styles.num}>{l.amount ? money(l.amount) : "—"}</td>
                  <td className={styles.num}>{l.trades || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        <div className={styles.splits}>
          {[
            { titre: t("Par secteur"), rows: vue.bySector },
            { titre: t("Par pays"), rows: vue.byCountry },
          ].map((g) => (
            <div key={g.titre} className={styles.figure}>
              <div className={styles.titre}>{g.titre}</div>
              {g.rows.map((r) => (
                <div key={r.label} className={styles.split}>
                  <span>{t(r.label)}</span>
                  <i style={{ width: `${Math.max(0, Math.min(100, r.pct))}%` }} />
                  <b>{fmtPct(r.pct, 1)}</b>
                </div>
              ))}
            </div>
          ))}
        </div>
    </div>
  );
}
