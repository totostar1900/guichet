import Link from "next/link";
import { StandingList } from "@/components/Standing";
import { requireSession } from "@/lib/auth";
import { nextRun, STANDING_STATE_LABEL } from "@/lib/domain/standing";
import { getT } from "@/i18n/server";
import { lireLeReinvestissement } from "../donnees";
import styles from "../page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mon instruction" };

/** CE QUI EST EN PLACE, et que le client arrête quand il veut. Une instruction qu'on vient de poser atterrit ici. */
export default async function InstructionPage() {
  const s = await requireSession("/moi/reinvestir/instruction");
  const t = await getT();
  const { offers, enPlace, fonds, aujourdHui } = await lireLeReinvestissement(s.userId);
  return (
    <Glissement>
      <div className={styles.page}>
        <EnTete titre={t("Mon instruction")} phrase={t("Ce qui est en place, et que vous arrêtez quand vous voulez.")} />
        {enPlace.length > 0 ? (
          <StandingList
            rows={enPlace.map((x) => {
              const o = offers.find((y) => y.id === x.offerId);
              return {
                id: x.id,
                ref: x.ref,
                offerId: x.offerId,
                title: o?.title ?? x.offerId,
                splits: x.splits?.map((y) => ({ offerId: y.offerId, title: offers.find((z) => z.id === y.offerId)?.title ?? y.offerId, pct: y.pct })),
                href: `/offres/${x.offerId}`,
                amount: x.amount,
                dayOfMonth: x.dayOfMonth,
                source: x.source,
                minAmount: x.minAmount,
                state: x.state,
                stateLabel: STANDING_STATE_LABEL[x.state],
                // La prochaine échéance est calculée par le domaine (standing, « nextRun »), jamais tue.
                next: nextRun(x, aujourdHui),
                lastRunOn: x.lastRunOn,
                stopReason: x.stopReason,
              };
            })}
            fonds={fonds}
          />
        ) : (
          <p className="muted">
            {t("Rien n'est en place pour l'instant.")} <Link href="/moi/reinvestir/mettre">{t("Mettre le réinvestissement en place")} →</Link>
          </p>
        )}
      </div>
    </Glissement>
  );
}
