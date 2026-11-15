import Link from "next/link";
import { StandingList } from "@/components/Standing";
import { requireSession } from "@/lib/auth";
import { STANDING_STATE_LABEL, nextRun } from "@/lib/domain/standing";
import { paiementDeLEpargne } from "@/lib/domain/mandat";
import { getT } from "@/i18n/server";
import { lireLEpargne } from "../donnees";
import styles from "../page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes épargnes programmées" };

/** CE QUI EST EN PLACE : la liste, et ce qu'on y fait (arrêter d'un bouton, sans motif). Une épargne qu'on vient de poser atterrit ici. */
export default async function EnPlacePage() {
  const s = await requireSession("/moi/epargne/en-place");
  const t = await getT();
  const { offers, standing, mandats, fonds, versements, aujourdHui } = await lireLEpargne(s.userId);
  return (
    <Glissement>
      <div className={styles.page}>
        <EnTete titre={t("Mes épargnes programmées")} phrase={t("Ce qui part chaque mois, et que vous arrêtez quand vous voulez.")} />
        {versements.length > 0 ? (
          <StandingList
                        rows={versements.map((x) => ({
                          id: x.id,
                          ref: x.ref,
                          offerId: x.offerId,
                          title: offers.find((y) => y.id === x.offerId)?.title ?? x.offerId,
                          splits: x.splits?.map((y) => ({ offerId: y.offerId, title: offers.find((z) => z.id === y.offerId)?.title ?? y.offerId, pct: y.pct })),
                          href: `/offres/${x.offerId}`,
                          amount: x.amount,
                          dayOfMonth: x.dayOfMonth,
                          source: x.source,
                          minAmount: x.minAmount,
                          paiement: paiementDeLEpargne(x, mandats, standing),
                          state: x.state,
                          stateLabel: STANDING_STATE_LABEL[x.state],
                          /* LA PROCHAINE ÉCHÉANCE, calculée plutôt que tue. La liste sait
                             l'afficher depuis toujours ; les deux pages lui passaient
                             « null », donc « prochain versement le … » ne paraissait
                             jamais. Le domaine la donne (standing, « nextRun »). */
                          next: nextRun(x, aujourdHui),
                          lastRunOn: x.lastRunOn,
                          stopReason: x.stopReason,
                        }))}
                        fonds={fonds}
                      />
        ) : (
          <p className="muted">
            {t("Rien n'est en place pour l'instant.")} <Link href="/moi/epargne/nouvelle">{t("Mettre une épargne en place")} →</Link>
          </p>
        )}
      </div>
    </Glissement>
  );
}
