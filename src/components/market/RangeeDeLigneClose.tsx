import Link from "next/link";
import type { Offer } from "@/lib/domain/types";
import { fmtPct } from "@/lib/format";
import { summarize } from "@/lib/domain/summary";
import { getT } from "@/i18n/server";
import styles from "@/components/OfferBrowser.module.css";

/**
 * UNE LIGNE CLOSE DU CATALOGUE, EN PLEINE LARGEUR (9 novembre 2026).
 *
 * Les séances closes ont quitté la page des adjudications d'Investir : elles se lisent ici, aux Résultats. La rangée est celle d'avant (nom, Trésor, coupon, date de clôture à gauche ; rendement à droite), mais sans le « ··· » qui la
 * rétrécissait de 40 px et coupait son nom : toute la largeur, le nom passe à la ligne au lieu de se tronquer. Toute la rangée mène à la fiche.
 */
export async function RangeeDeLigneClose({ o }: { o: Offer }) {
  const t = await getT();
  const s = summarize(o, new Date());
  const meta = [t(o.countryName), o.couponRate != null ? t("coupon {c}", { c: fmtPct(o.couponRate, 2) }) : null, s.deadlineParts ? t("clôturée le {d}", { d: s.deadlineParts[0] }) : t("clôturée")].filter(Boolean).join(" · ");
  return (
    <Link href={`/offres/${o.id}`} className={styles.rangee}>
      <span className={styles.rangeeNom}>
        <b>{t(o.title)}</b>
        <small>{meta}</small>
      </span>
      <span className={styles.rangeeVal}>
        <b>{s.hero}</b>
        <small>{t(s.heroUnit ?? s.heroSub)}</small>
      </span>
    </Link>
  );
}
