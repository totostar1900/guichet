import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import { Appareil } from "@/app/moi/appareil/Appareil";
import { SecurityPanel } from "@/app/moi/securite/SecurityPanel";
import { DeconnexionPartout } from "@/app/moi/compte/Deconnexion";
import { Connexion } from "./Connexion";
import styles from "@/components/Feuillet.module.css";

export const dynamic = "force-dynamic";
/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Paramètres") };
}

/**
 * PARAMÈTRES : UNE PAGE POUR CE QUI RÈGLE L'APPLICATION (19 novembre 2026, planche « Paramètres et connexion », 1A + 2A).
 *
 * « Sécurité et connexion » et « Préférences » ne faisaient qu'une question pour le client : comment Guichet s'ouvre, et ce qui me notifie. Elles tiennent ici en deux sections d'interrupteurs, sous « Mon compte » dans le menu mais hors de lui. La palette et la langue restent dans le menu du coin.
 *
 * LA PRÉFÉRENCE SE LIT AU COMPTE, PAS À LA SESSION : elle change d'un appareil à l'autre dans la même minute.
 */
export default async function ParametresPage() {
  const s = await requireSession("/parametres");
  const t = await getT();
  const r = repo();
  const [prefs, canaux, contact, tous] = await Promise.all([
    r.getPrefs(s.userId).catch(() => undefined),
    r.getChannelStatus(s.userId).catch(() => undefined),
    r.getContact(s.userId).catch(() => undefined),
    r.listDevices(s.userId).catch(() => []),
  ]);
  /* Le code du compte n'est pas un appareil : il se dit à part, dans « Connexion ». */
  const appareils = tous.filter((d) => d.kind !== "code");
  const aUnCode = tous.some((d) => d.kind === "code");

  return (
    <Glissement>
      <div className={styles.page}>
        <EnTete surTitre={t("Vous")} titre={t("Paramètres")} />
        <Connexion aUnCode={aUnCode} />
        <Appareil prefs={prefs} phoneOk={Boolean(canaux?.phoneVerifiedAt)} vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} whatsapp={Boolean(contact?.whatsappOptIn)} emailOptIn={Boolean(contact?.emailOptIn)} hasPhone={Boolean(contact?.phone ?? s.phone)} hasEmail={Boolean(contact?.email ?? s.email)} />
        <SecurityPanel devices={appareils} />
        {/* « Se déconnecter partout » vit avec la sécurité : c'est un geste, pas une destination. */}
        <DeconnexionPartout />
      </div>
    </Glissement>
  );
}
