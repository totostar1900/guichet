import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { referenceDeProvision } from "@/lib/domain/cash";
import { getT } from "@/i18n/server";
import { Copier } from "../../../Copier";
import styles from "../../../page.module.css";
import barre from "@/components/mobile/BarreDEtape.module.css";
import { BarreCollante } from "@/components/mobile/BarreDEtape";
import { BoutonRetour } from "@/components/mobile/BoutonRetour";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Nous attendons votre virement") };
}

/**
 * APPROVISIONNER, TROISIÈME ÉTAPE : LA CONFIRMATION (10 novembre 2026).
 *
 * « J'ai fait le virement » n'écrit rien : la maison ne sait un virement qu'à son arrivée, par le motif. Cette page dit ce qui va se passer et rappelle le motif, pour qu'un client qui s'est trompé de ligne puisse le recopier encore.
 */
export default async function VirementEnvoyePage() {
  const t = await getT();
  const s = await requireSession("/moi/provision/alimenter/virement/envoye");
  const reference = referenceDeProvision(s.userId);
  return (
    <Glissement>
      <div className={styles.wrap}>
        <EnTete
          surTitre={t("Mon argent chez nous")}
          titre={t("Nous attendons votre virement")}
          phrase={t("Nous le reconnaissons à son arrivée, grâce au motif ci-dessous. Votre solde se met à jour à ce moment-là.")}
        />
        <dl className={styles.coord}>
          <div className={styles.ligneMotif}>
            <dt>{t("Motif du virement")}</dt>
            <dd>
              <b className="mono">{reference}</b>
              <Copier valeur={reference} quoi={t("le motif du virement")} />
            </dd>
          </div>
        </dl>
        <BarreCollante>
          <BoutonRetour href="/moi/provision/alimenter/virement" className={`btn ${barre.retour}`}>
            {t("Retour")}
          </BoutonRetour>
          <Link href="/moi/provision" className={`btn primary ${barre.suivant}`}>
            {t("Voir ma provision")}
          </Link>
        </BarreCollante>
      </div>
    </Glissement>
  );
}
