import { Simulator } from "@/components/Simulator";
import { BackToTop } from "@/components/BackToTop";
import { GuideBar } from "../GuideBar";
import { EnTete } from "@/components/EnTete";
import { CoachMarks } from "@/components/mobile/CoachMarks";
import { Glissement } from "@/components/mobile/Glissement";
import { getT } from "@/i18n/server";
import styles from "../page.module.css";

/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Simulateur") };
}

/**
 * LE SIMULATEUR, SUR SA PAGE.
 *
 * Il vivait plié dans la troisième section du Guide : on ne l'atteignait qu'en
 * descendant et en dépliant. C'est un outil, et un outil se partage par son
 * adresse — « /info/simulateur » — pas par une ancre dans une page de six
 * sections.
 */
export default async function SimulateurPage() {
  const t = await getT();
  return (
    <Glissement>
      <div className={styles.wrap}>
        <EnTete
          surTitre={t("Aide")}
          titre={t("Simulateur d'obligation")}
          phrase={t("Comment le prix, le coupon et la durée fabriquent le rendement : faites varier, regardez. L'outil ne porte sur aucune offre en cours : les prix des offres sont fixés par le desk et se lisent dans Guichet.")}
        />
        <div className={styles.sim} data-coach="info-sim">
          <div className={styles.warn}>{t("Outil pédagogique : résultats bruts, avant fiscalité, convention Exact/Exact. Ne constitue ni une offre ni un conseil.")}</div>
          <Simulator />
        </div>
        <BackToTop lift />
        <GuideBar pos={{ label: t("Simulateur") }} />
        {/* L'arrêt du Guide qui expliquait le simulateur vient avec lui. */}
        <CoachMarks
          id="simulateur"
          replayLabel={t("À quoi sert le simulateur ?")}
          stops={[{ target: "info-sim", title: t("Le simulateur"), text: t("Faites varier le prix, le coupon et la durée : vous voyez le rendement bouger. Un outil pour comprendre, qui ne porte sur aucune ligne réelle.") }]}
        />
      </div>
    </Glissement>
  );
}
