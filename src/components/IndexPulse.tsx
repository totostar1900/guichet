import Link from "next/link";
import { repo } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { indexSeries, indexStats } from "@/lib/market/index";
import { getT } from "@/i18n/server";
import styles from "./IndexPulse.module.css";

const signed = (v?: number, d = 1) => (v == null ? "—" : `${v > 0 ? "+" : ""}${v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d })} %`);
const tone = (v?: number) => (v == null || Math.abs(v) < 0.005 ? styles.flat : v > 0 ? styles.up : styles.down);

/**
 * The pulse of the equity market: the BVMAC All Share Index as the last
 * bulletin printed it, the session, the month, the year to date and twelve
 * months, sixty sessions in a line. A price index, and a link to the lesson
 * that says how to read it. Quiet when no bulletin carried the index yet.
 */
export async function IndexPulse({ compact }: { compact?: boolean }) {
  const t = await getT();
  const bulletins = await repo().listBulletins(400).catch(() => []);
  const stats = indexStats(indexSeries(bulletins));
  if (!stats.last) return null;
  const pts = stats.points.slice(-60);
  const min = Math.min(...pts.map((p) => p.value));
  const max = Math.max(...pts.map((p) => p.value));
  const span = max - min || 1;
  const line = pts.map((p, i) => `${((i / Math.max(1, pts.length - 1)) * 416 + 2).toFixed(1)},${(56 - ((p.value - min) / span) * 50).toFixed(1)}`).join(" ");
  return (
    <section className={`${styles.pulse} ${compact ? styles.compact : ""}`} aria-label="BVMAC All Share Index" data-coach="indice">
      <div className={styles.level}>
        <small>BVMAC All Share</small>
        <b>{stats.last.value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
        <span className={styles.date}>{fmtDate(stats.last.date)}</span>
      </div>
      <div className={styles.body}>
        <svg viewBox="0 0 420 60" role="img" aria-label={t("Soixante dernières séances de l'indice")} className={styles.spark}>
          <title>{t("Soixante dernières séances de l'indice")}</title>
          <line x1="0" y1="59" x2="420" y2="59" className={styles.axis} />
          {pts.length >= 2 && <polyline points={line} className={styles.line} />}
        </svg>
        <div className={styles.stats}>
          <span>
            {t("séance")} <b className={tone(stats.day)}>{signed(stats.day, 2)}</b>
          </span>
          <span>
            {t("un mois")} <b className={tone(stats.month)}>{signed(stats.month)}</b>
          </span>
          <span>
            {t("depuis le 1er janvier")} <b className={tone(stats.ytd)}>{signed(stats.ytd)}</b>
          </span>
          <span>
            {t("douze mois")} <b className={tone(stats.year)}>{signed(stats.year)}</b>
          </span>
          <Link href="/info/indice-bvmac" className={styles.how}>
            {t("comment le lire")} →
          </Link>
        </div>
      </div>
      <span className={styles.tag} title={t("Les dividendes ne sont pas comptés dans l'indice")}>
        {t("indice de prix")}
      </span>
    </section>
  );
}
