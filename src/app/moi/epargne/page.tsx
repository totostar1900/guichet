import Link from "next/link";
import { StandingList } from "@/components/Standing";
import { requireSession } from "@/lib/auth";
import { STANDING_STATE_LABEL, nextRun } from "@/lib/domain/standing";
import { paiementDeLEpargne } from "@/lib/domain/mandat";
import { getT } from "@/i18n/server";
import { lireLEpargne } from "./donnees";
import styles from "./page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import { EnBref } from "@/components/EnBref";
import { BarreDEtape } from "@/components/mobile/BarreDEtape";
import barre from "@/components/mobile/BarreDEtape.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Épargne programmée" };

/**
 * L'ÉPARGNE PROGRAMMÉE EST SA PROPRE LISTE (décision du 15 novembre 2026, maquette « Épargne » : 1A · 2A · 3 OK · 4 28).
 *
 * Elle était un sommaire de trois tuiles : pour voir une épargne, deux pages. Elle porte maintenant la liste, un bouton jaune collé en bas pour en mettre une
 * en place, et un « i » qui porte l'explication (« Comment cela marche » a été fusionné avec lui). Une épargne retirée ne se consulte plus ; une suspendue
 * reste visible avec sa raison.
 *
 * PLACER CHAQUE MOIS N'EST PAS AUTORISER UN PRÉLÈVEMENT : ce sont deux décisions. L'épargne dit COMBIEN part, QUAND et VERS QUOI (un ordre debout) ;
 * le mandat dit seulement que la maison peut débiter un compte, sous un plafond. Le « i » nomme l'un dans l'autre sans les mêler.
 */
export default async function EpargnePage() {
  const s = await requireSession("/moi/epargne");
  const t = await getT();
  const { offers, standing, mandats, versements, aujourdHui } = await lireLEpargne(s.userId);
  const visibles = versements.filter((x) => x.state === "active" || x.state === "suspendue");
  return (
    <Glissement>
      <div className={styles.page}>
        <EnTete
          titre={t("Épargne programmée")}
          phrase={t("Une somme fixe, un jour du mois, une destination choisie maintenant : le versement part tout seul, et vous le retirez quand vous voulez. Chaque épargne se paie par un mandat de prélèvement, signé dans la même démarche.")}
          aCote={<EnBref brief="epargne" />}
        />
        <StandingList
          rows={visibles.map((x) => ({
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
            // La prochaine échéance est calculée par le domaine (standing, « nextRun »), jamais tue.
            next: ["prelevement", "virement"].includes(paiementDeLEpargne(x, mandats, standing)) ? nextRun(x, aujourdHui) : null,
            lastRunOn: x.lastRunOn,
            stopReason: x.stopReason,
          }))}
          vide={<p className={styles.vide}>{t("Aucune épargne en place pour l'instant. Le fonds, la somme et le jour se choisissent avec le bouton ci-dessous.")}</p>}
        />
        <BarreDEtape>
          <Link className={`btn primary ${barre.suivant}`} href="/moi/epargne/nouvelle">
            {t("Mettre une épargne en place")}
          </Link>
        </BarreDEtape>
      </div>
    </Glissement>
  );
}
