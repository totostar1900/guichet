import Link from "next/link";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { seancesAnnoncees } from "@/lib/domain/listes";
import { nomDeSeance } from "@/lib/domain/nom-de-ligne";
import { localIso } from "@/lib/format";
import { GrilleDuMois } from "@/components/market/GrilleDuMois";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Calendrier des séances") };
}

/**
 * LE CALENDRIER DES SÉANCES A SA PAGE (9 novembre 2026).
 *
 * Il était sous la liste des adjudications ; le dirigeant l'en a fait sortir : la liste se lit, le calendrier se consulte. Un mois, un point par jour de clôture, les séances du jour dessous, et les gestes de
 * ce qu'on vient faire après avoir lu les dates : en proposer une, retrouver ses alertes, voir toutes les échéances.
 */
export default async function CalendrierDesSeancesPage() {
  const [t, offers] = await Promise.all([getT(), repo().listOffers()]);
  const seances = seancesAnnoncees(offers);
  return (
    <Glissement>
      <div className="pile">
        <EnTete surTitre={t("Investissez")} titre={t("Calendrier des séances")} phrase={t("Les jours où une séance se clôt. Touchez un jour marqué pour lire ses séances.")} />
        <section className={styles.carte} aria-label={t("Calendrier des séances")}>
          <GrilleDuMois
            aujourdhui={localIso(new Date())}
            seances={seances.map((o) => ({ id: o.id, titre: nomDeSeance(o.title), jour: o.deadlineAt.slice(0, 10), clotureLe: o.deadlineAt, href: `/offres/${o.id}` }))}
          />
        </section>
        <div className={styles.boutons}>
          <Link className="btn primary" href="/sondage">
            {t("Proposer une adjudication")}
          </Link>
          <Link className="btn" href="/moi/suivies">
            {t("Mes alertes")}
          </Link>
          <Link className="btn" href="/echeances">
            {t("Toutes les échéances")}
          </Link>
        </div>
      </div>
    </Glissement>
  );
}
