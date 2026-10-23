import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { Glissement, LienRetour } from "@/components/mobile/Glissement";
import { Appareil } from "./Appareil";
import styles from "@/components/Feuillet.module.css";

export const dynamic = "force-dynamic";
/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Cet appareil") };
}

/**
 * LA CINQUIÈME RUBRIQUE DU COMPTE : CE QUE FAIT L'APPAREIL QU'ON TIENT.
 *
 * Les alertes, les couleurs, la langue, le canal préféré et les relevés par
 * e-mail étaient les cinq dernières lignes de la feuille du compte, qu'il
 * fallait atteindre en défilant sous dix-sept tuiles. Elles tiennent une page,
 * et la page dit laquelle des deux portées chaque réglage a.
 *
 * LA PRÉFÉRENCE SE LIT AU COMPTE, PAS À LA SESSION : elle change d'un appareil
 * à l'autre dans la même minute, et un jeton de session garderait celle qui
 * avait cours à la connexion.
 */
export default async function AppareilPage() {
  const s = await requireSession("/moi/appareil");
  const t = await getT();
  const r = repo();

  const [prefs, canaux] = await Promise.all([
    r.getPrefs(s.userId).catch(() => undefined),
    r.getChannelStatus(s.userId).catch(() => undefined),
  ]);

  return (
    <Glissement>
      <div className={styles.page}>
        <nav className={styles.fil}>
          <LienRetour href="/moi/compte">{t("Votre compte")}</LienRetour>
        </nav>

        <header className={styles.tete}>
          <h1>{t("Cet appareil")}</h1>
          <p>{t("Ce que cet appareil-ci fait de lui-même, et ce que la maison fait partout : les alertes et les couleurs d'un côté, la façon de vous joindre de l'autre.")}</p>
        </header>

        <Appareil prefs={prefs} phoneOk={Boolean(canaux?.phoneVerifiedAt)} vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
      </div>
    </Glissement>
  );
}
