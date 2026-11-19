import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { SecurityPanel } from "./SecurityPanel";
import { DeconnexionPartout } from "../compte/Deconnexion";
import styles from "./page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export const dynamic = "force-dynamic";
/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Sécurité et connexion") };
}

/** The client's proven channels and trusted devices. */
export default async function SecurityPage() {
  const s = await requireSession("/moi/securite");
  const r = repo();
  const devices = await r.listDevices(s.userId);
  const t = await getT();
  return (
    <Glissement>
      <div className={styles.wrap}>
        {/* LE FIL D'ARIANE PART, et c'était le seul de l'application : un
            chemin cliquable dans le créneau du sur-titre disait en plus long
            ce que le retour dit déjà, et il faisait de ce créneau une
            troisième grammaire. Le retour remonte au compte, dont « Sécurité »
            est une rubrique ; le sur-titre dit la famille. Voir ETALON.md. */}
        <EnTete
          /* LE RETOUR NOMME LA PAGE D'AU-DESSUS, LE SUR-TITRE NOMME LA
             FAMILLE, et ce n'est pas le même mot : « ← Votre compte » suivi
             de « VOTRE COMPTE » écrivait la même chose deux fois, à deux
             lignes d'écart, dans les deux créneaux que l'étalon distingue.
             La famille de cette page est celle que porte « /moi/compte »
             lui-même. */
          surTitre={t("Vous")}
          titre={t("Sécurité et connexion")}
          phrase={t("Les appareils qui vous ouvrent Guichet d'un doigt ou de quatre chiffres. Le code par e-mail reste toujours là.")}
        />
        <SecurityPanel who={s.name} devices={devices} />

        {/* « SE DÉCONNECTER PARTOUT » VIT AVEC LA SÉCURITÉ (19 novembre 2026, planche « Compte, connexion et textes », 3A) : c'est un geste de sécurité, pas une destination. Les coordonnées sont sur « Profil et coordonnées », les alertes et le canal de contact dans « Préférences ». */}
        <DeconnexionPartout />
      </div>
    </Glissement>
  );
}
