import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { SourceViewer } from "@/components/SourceViewer";
import styles from "../../moi/documents/[id]/page.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("La convention") };
}

/**
 * LA CONVENTION SE LIT AVANT D'ÊTRE SIGNÉE, ET DANS L'APP.
 *
 * « Lire la convention complète » était un lien vers le PDF, ouvert à part.
 * Sous « /desk » d'abord, donc inatteignable au client ; puis sous « /api »,
 * donc atteignable, mais toujours en « target=_blank » : dans l'app installée,
 * qui tourne en standalone, cela emporte l'app. On demandait donc une signature
 * sur un texte que le signataire ne pouvait pas lire.
 *
 * Elle a maintenant sa page, avec le retour vers le dossier : le texte se lit,
 * se parcourt au doigt, et on revient d'où l'on venait.
 */
export default async function ConventionPage() {
  const t = await getT();
  await requireSession("/ouvrir-un-compte/convention");
  return (
    <div className={styles.wrap}>
      <Link href="/ouvrir-un-compte" className={styles.back}>
        ← {t("Mon dossier d'ouverture")}
      </Link>
      <div className={styles.head}>
        <div>
          <div className="eyebrow">{t("Modèle")}</div>
          <h1 className="display">{t("Convention d'ouverture de compte-titres")}</h1>
          <p className={styles.lead}>{t("Le texte complet, tel que vous l'accepterez. Vous pouvez le lire autant de fois que vous le voulez avant de signer.")}</p>
        </div>
      </div>
      <div className={styles.visionneuse}>
        <SourceViewer src="/api/documents/convention-modele" title={t("Convention d'ouverture de compte-titres")} fill />
      </div>
    </div>
  );
}
