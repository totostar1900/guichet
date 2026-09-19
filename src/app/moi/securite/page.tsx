import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { SecurityPanel } from "./SecurityPanel";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sécurité" };

/** The client's proven channels and trusted devices. */
export default async function SecurityPage() {
  const s = await requireSession("/moi/securite");
  const r = repo();
  const [channels, devices] = await Promise.all([r.getChannelStatus(s.userId), r.listDevices(s.userId)]);
  const t = await getT();
  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <div className="eyebrow">
            <Link href="/moi">{t("Mon espace")}</Link> › {t("Sécurité")}
          </div>
          <h1 className="display">{t("Sécurité")}</h1>
          <p className={styles.lead}>{t("Deux canaux prouvés, e-mail et WhatsApp, et les appareils qui vous ouvrent le Guichet d'un doigt ou de quatre chiffres. Le code par e-mail reste toujours là.")}</p>
        </div>
      </div>
      <SecurityPanel who={s.name} channels={channels} devices={devices} sessionEmail={s.email} />
    </div>
  );
}
