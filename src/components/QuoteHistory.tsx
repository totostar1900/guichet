import type { Quote } from "@/lib/domain/market";
import { fmt, fmtDate, fmtPct, fmtPrice } from "@/lib/format";
import styles from "./QuoteHistory.module.css";
import { getT } from "@/i18n/server";

/**
 * What the bulletin says about a listed line: closing history (sparkline),
 * the last sessions, and the day's frame (thresholds, volumes, accrued coupon).
 * Server-rendered; the data is the ingested BOC, never typed by the desk.
 */
export async function QuoteHistory({ quotes }: { quotes: Quote[] }) {
  const t = await getT();
  if (quotes.length === 0) return null;
  const latest = quotes[0];
  const isBond = latest.instrument === "obligation";
  const price = (v: number) => (isBond ? fmtPrice(v) : fmt(v));
  const series = [...quotes].reverse().slice(-40);
  const closes = series.map((q) => q.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const W = 320;
  const H = 64;
  const pad = 4;
  const x = (i: number) => (series.length === 1 ? W / 2 : pad + (i * (W - 2 * pad)) / (series.length - 1));
  const y = (v: number) => (max === min ? H / 2 : H - pad - ((v - min) * (H - 2 * pad)) / (max - min));
  const path = series.map((q, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(q.close).toFixed(1)}`).join(" ");
  const area = `${path} L${x(series.length - 1).toFixed(1)} ${H - pad} L${x(0).toFixed(1)} ${H - pad} Z`;
  const first = series[0].close;
  const change = first > 0 ? ((latest.close / first) - 1) * 100 : 0;
  const signed = (v: number, d = 2) => `${v > 0 ? "+" : ""}${fmtPct(v, d)}`;

  return (
    <div className={styles.wrap}>
      <div className={styles.chart}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Clôtures sur ${series.length} séances, de ${price(first)} à ${price(latest.close)}`}>
          <path d={area} className={styles.area} />
          <path d={path} className={styles.line} />
          <circle cx={x(series.length - 1)} cy={y(latest.close)} r={3.5} className={styles.dot} />
        </svg>
        <div className={styles.legend}>
          <span>
            {t(series.length > 1 ? "{n} séances · du {a} au {b}" : "1 séance · du {a} au {b}", { n: series.length, a: fmtDate(series[0].sessionDate), b: fmtDate(latest.sessionDate) })}
          </span>
          <b className={change < 0 ? styles.down : styles.up}>{signed(change)}</b>
        </div>
      </div>

      <dl className={styles.frame}>
        <div>
          <dt>{t("Clôture")}</dt>
          <dd>{price(latest.close)}</dd>
        </div>
        <div>
          <dt>{t("Variation")}</dt>
          <dd className={latest.variationPct < 0 ? styles.down : latest.variationPct > 0 ? styles.up : undefined}>{signed(latest.variationPct)}</dd>
        </div>
        <div>
          <dt>{t("Seuils de séance")}</dt>
          <dd>
            {price(latest.thresholdLow)} – {price(latest.thresholdHigh)}
          </dd>
        </div>
        {isBond ? (
          <>
            <div>
              <dt>{t("Coupon couru (J+3)")}</dt>
              <dd>{latest.accruedCoupon != null ? `${fmt(latest.accruedCoupon)} FCFA / titre` : "—"}</dd>
            </div>
            <div>
              <dt>{t("Nominal restant dû")}</dt>
              <dd>{latest.nominalRemaining != null ? `${fmt(latest.nominalRemaining)} FCFA` : "—"}</dd>
            </div>
            <div>
              <dt>{t("Référence prochaine séance")}</dt>
              <dd>{fmt(latest.referenceNext)} FCFA</dd>
            </div>
          </>
        ) : (
          <>
            <div>
              <dt>{t("Volume échangé")}</dt>
              <dd>
                {fmt(latest.volumeTraded)} titre{latest.volumeTraded > 1 ? "s" : ""} · {fmt(latest.valueTraded)} FCFA
              </dd>
            </div>
            <div>
              <dt>{t("Depuis le 1er janvier")}</dt>
              <dd>{latest.ytdVariationPct != null ? signed(latest.ytdVariationPct) : "—"}</dd>
            </div>
            <div>
              <dt>{t("Référence prochaine séance")}</dt>
              <dd>{fmt(latest.referenceNext)} FCFA</dd>
            </div>
          </>
        )}
      </dl>

      <table className={styles.tbl}>
        <thead>
          <tr>
            <th>{t("Séance")}</th>
            <th className={styles.r}>{t("Clôture")}</th>
            <th className={styles.r}>{t("Var.")}</th>
            {!isBond && <th className={styles.r}>{t("Volume")}</th>}
            <th>{t("Bulletin")}</th>
          </tr>
        </thead>
        <tbody>
          {quotes.slice(0, 6).map((q) => (
            <tr key={q.sessionDate}>
              <td>{fmtDate(q.sessionDate)}</td>
              <td className={styles.r}>{price(q.close)}</td>
              <td className={`${styles.r} ${q.variationPct < 0 ? styles.down : q.variationPct > 0 ? styles.up : ""}`}>{signed(q.variationPct)}</td>
              {!isBond && <td className={styles.r}>{fmt(q.volumeTraded)}</td>}
              <td className={styles.muted}>BOC n° {q.bulletinNo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
