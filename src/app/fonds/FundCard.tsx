"use client";

import { useT } from "@/i18n/client";
import Link from "next/link";
import { useDensity } from "@/components/Density";
import { LineMenu } from "@/components/mobile/LineMenu";
import { SwipeActions } from "@/components/mobile/SwipeActions";
import { FUND_CATEGORY_LABEL, FUND_FREQUENCY_LABEL } from "@/lib/domain/market";
import { fmt, fmtDate, fmtPct } from "@/lib/format";
import type { FundRow } from "./FundsBrowser";
import styles from "@/components/OfferCard.module.css";

const signed = (v?: number) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, 2)}`);
const cls = (v?: number) => (v == null ? "" : v > 0 ? styles.up : v < 0 ? styles.down : "");

/**
 * A fund on the phone, the same shape as a security's card: the fund and
 * who runs it, the NAV large with its date, then twelve months · since
 * inception · change; the « ··· » in the corner, « Voir la fiche » at the
 * foot; pulled left it offers « Déclarer » and « Me rappeler », pulled right
 * it turns over (manager, depositary, NAV rhythm, inception, ISIN). Compact:
 * the fund, the NAV, twelve months.
 */
export function FundCard({ r }: { r: FundRow }) {
  const t = useT();
  const compact = useDensity() === "compact";
  const href = `/offres/${r.id}`;
  return (
    <SwipeActions
      id={r.id}
      back={
        <div className={styles.backGrid}>
          <div>
            <span>{t("Société de gestion")}</span>
            <b>{r.manager}</b>
          </div>
          <div>
            <span>{t("Dépositaire")}</span>
            <b>{r.depositary}</b>
          </div>
          <div>
            <span>{t("VL")}</span>
            <b>{t(FUND_FREQUENCY_LABEL[r.frequency])}</b>
            <em>{t("dernière")} {fmtDate(r.navDate)}</em>
          </div>
          <div>
            <span>{t("Création du fonds")}</span>
            <b>{r.inceptionDate ? fmtDate(r.inceptionDate) : "—"}</b>
            {r.inceptionDate && <em>{t("depuis l'origine")} {signed(r.perfSinceInceptionPct)}</em>}
          </div>
          <div>
            <span>ISIN</span>
            <b className={styles.mono}>{r.isin}</b>
          </div>
          <div>
            <span>{t("Catégorie")}</span>
            <b>{t(FUND_CATEGORY_LABEL[r.category])}</b>
          </div>
        </div>
      }
    >
      <article className={`${styles.card} ${compact ? styles.compact : ""}`} style={{ ["--card-c" as string]: "var(--info)" }}>
        <div className={styles.head}>
          <div className={styles.fundId}>
            <div className={styles.fundTitle}>
              <Link href={href}>{r.title}</Link>
            </div>
            <div className={styles.fundSub}>
              {t(FUND_CATEGORY_LABEL[r.category])} · {t(FUND_FREQUENCY_LABEL[r.frequency])} · {r.manager}
            </div>
            <div className={styles.fundSub}>
              {t("Dépositaire")} : {r.depositary}
            </div>
          </div>
          <div className={styles.corner}>
            <span className={`pill ${r.open ? "open" : "quoted"}`}>{t(r.open ? "Souscription ouverte" : "Information")}</span>
            <LineMenu line={{ id: r.id, title: r.title, isin: r.isin, sub: `${r.manager} · VL ${fmt(r.nav)} FCFA` }} />
          </div>
        </div>
        <div className={styles.big}>
          <b>VL {fmt(r.nav)}</b>
          <small>
            FCFA · {t("au")} {fmtDate(r.navDate, false)}
          </small>
          <span className={`${styles.whenC} ${cls(r.perf1yPct)}`}>
            {t("12 mois")} {signed(r.perf1yPct)}
          </span>
        </div>
        <div className={styles.facts}>
          <div>
            <span>{t("12 mois")}</span>
            <b className={cls(r.perf1yPct)}>{signed(r.perf1yPct)}</b>
          </div>
          <div>
            <span>{t("Depuis l'origine")}</span>
            <b className={cls(r.perfSinceInceptionPct)}>{signed(r.perfSinceInceptionPct)}</b>
            {r.inceptionDate && <em>{t("depuis le")} {fmtDate(r.inceptionDate)}</em>}
          </div>
          <div>
            <span>{t("Variation")}</span>
            <b className={cls(r.variationPct)}>{signed(r.variationPct)}</b>
          </div>
        </div>
        <div className={styles.foot}>
          <span className={styles.when}>{t(r.open ? "prochaine VL : souscription possible" : "non distribué : dites-nous votre intérêt")}</span>
          <Link className="btn sm" href={href}>
            {t("Voir la fiche")} →
          </Link>
        </div>
      </article>
    </SwipeActions>
  );
}
