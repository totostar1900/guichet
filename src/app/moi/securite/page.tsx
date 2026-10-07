import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { SecurityPanel } from "./SecurityPanel";
import { ContactForm } from "../ContactForm";
import { ConsentForm } from "../ConsentForm";
import { PushToggle } from "@/components/PushToggle";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Sécurité") };
}

/** The client's proven channels and trusted devices. */
export default async function SecurityPage() {
  const s = await requireSession("/moi/securite");
  const r = repo();
  const [channels, devices, contact] = await Promise.all([r.getChannelStatus(s.userId), r.listDevices(s.userId), r.getContact(s.userId)]);
  const t = await getT();
  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <div className="eyebrow">
            <Link href="/">{t("Portefeuille")}</Link> › {t("Sécurité")}
          </div>
          <h1 className="display">{t("Sécurité")}</h1>
          <p className={styles.lead}>{t("Deux canaux prouvés, e-mail et téléphone, et les appareils qui vous ouvrent Guichet d'un doigt ou de quatre chiffres. Le code par e-mail reste toujours là.")}</p>
        </div>
      </div>
      <SecurityPanel who={s.name} channels={channels} devices={devices} sessionEmail={s.email} />

      {/* LES COORDONNÉES VIVENT ICI depuis le 2 octobre 2026, et non plus sur le
          tableau de bord. Le téléphone et l'adresse SONT les deux canaux
          prouvés : les éditer ailleurs que là où leur preuve se gouverne faisait
          deux endroits pour une seule chose. Le consentement les suit, parce que
          c'est la même question posée autrement, et les alertes aussi, parce que
          c'est le même appareil. */}
      <h2 className={styles.h2}>{t("Mes coordonnées")}</h2>
      <div className="panel">
        <ContactForm phone={contact?.phone ?? s.phone} email={contact?.email ?? s.email} />
        <div className={styles.bloc}>
          <b>{t("Informations et opportunités")}</b>
          <ConsentForm whatsapp={Boolean(contact?.whatsappOptIn)} email={Boolean(contact?.emailOptIn)} hasPhone={Boolean(contact?.phone ?? s.phone)} hasEmail={Boolean(contact?.email ?? s.email)} />
        </div>
        <div className={styles.bloc}>
          <b>{t("Alertes sur cet appareil")}</b>
          <PushToggle vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
        </div>
      </div>
    </div>
  );
}
