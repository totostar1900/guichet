import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import styles from "../page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Approvisionner votre compte") };
}

/**
 * APPROVISIONNER VOTRE COMPTE, PREMIÈRE ÉTAPE : CHOISIR (10 novembre 2026, planche « Dividendes et approvisionnement », 2A).
 *
 * La page portait les deux chemins l'un sous l'autre, avec toutes leurs lignes : on lisait deux cartes pleines avant d'avoir choisi. Elle est devenue trois pages — le choix ici, puis « virement » (les coordonnées, une ligne un « copier », et « J'ai fait le virement »)
 * ou « prélèvement » (le mandat, ou sa mise en place), puis la confirmation du virement. De vraies adresses : le retour du système revient d'une étape, et chaque étape se partage.
 *
 * CE QUI SÉPARE LES DEUX CHEMINS EST QUI AGIT, pas leur rythme : un virement part de la banque DU CLIENT, à son initiative, et la maison ne fait que le reconnaître à son arrivée ; un prélèvement part de LA MAISON, sur une autorisation signée. C'est la seule chose à avoir comprise avant de choisir, et elle est écrite sous chaque titre.
 *
 * Le prélèvement se montre même sans mandat : une porte qui n'apparaît qu'à ceux qui l'ont déjà franchie n'ouvre sur personne. Il se CHANGE là où il vit, à /moi/prelevements.
 */
export default async function AlimenterPage() {
  const t = await getT();
  const s = await requireSession("/moi/provision/alimenter");
  const mandats = await repo()
    .listMandats(s.userId)
    .catch(() => []);
  const mandat = mandats.find((m) => m.objet === "provision" && m.state !== "revoque" && m.signedAt);

  return (
    <Glissement>
      <div className={styles.wrap}>
        <EnTete
          surTitre={t("Mon argent chez nous")}
          titre={t("Approvisionner votre compte")}
          phrase={t("Deux chemins. Un virement quand vous voulez, ou une somme fixe chaque mois, sans y penser.")}
          aCote={mandat ? <span className={`${styles.etiq} ${styles.etiqOn}`}>{t("Prélèvement actif")}</span> : undefined}
        />

        <div className={styles.chemins}>
          <Link href="/moi/provision/alimenter/virement" className={`${styles.chemin} ${styles.choix}`}>
            <h2>
              {t("Par virement")} <span>{t("une fois")}</span>
            </h2>
            {/* QUI AGIT, et non à quel rythme : c'est la seule chose à avoir comprise avant de choisir entre les deux chemins. */}
            <p className={styles.qui}>{t("C'est vous qui l'envoyez, depuis votre banque, quand vous voulez. Nous le reconnaissons à son arrivée.")}</p>
            <span className={styles.va} aria-hidden="true">
              ›
            </span>
          </Link>

          <Link href="/moi/prelevements?de=alimenter" className={`${styles.chemin} ${styles.choix}`}>
            <h2>
              {t("Par prélèvement")} <span>{t("chaque mois")}</span>
            </h2>
            <p className={styles.qui}>{t("C'est nous qui le prenons, sur votre compte en banque, sur une autorisation que vous avez signée.")}</p>
            <span className={styles.va} aria-hidden="true">
              ›
            </span>
          </Link>
        </div>
      </div>
    </Glissement>
  );
}
