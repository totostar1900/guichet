import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { peutLireLeDocument } from "@/lib/documents/acces";
import { DOC_LABEL } from "@/lib/documents/registry";
import { fmtDateTime } from "@/lib/format";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const doc = await repo()
    .getDocument((await params).id)
    .catch(() => undefined);
  return { title: doc ? `${doc.number} · ${t("Mes documents")}` : t("Mes documents") };
}

/**
 * UN DOCUMENT SE LIT SANS QUITTER L'APP.
 *
 * Les liens menaient droit au PDF. Dans un navigateur c'est sans conséquence ;
 * dans l'app installée, qui tourne en « standalone » (voir manifest.ts), il n'y
 * a ni barre d'adresse ni bouton de retour : le PDF remplaçait la vue et le
 * lecteur restait coincé dedans, sans aucun chemin vers son espace. Signalé le
 * 8 octobre 2026, après l'édition d'un relevé.
 *
 * Le document vit donc dans une page de l'app : l'en-tête et le retour sont
 * ceux de la maison, le PDF s'affiche dedans quand le navigateur sait le faire,
 * et le téléchargement reste offert pour les autres, qui laisse l'app en place.
 */
export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const { id } = await params;
  const s = await requireSession(`/moi/documents/${id}`);
  const doc = await repo().getDocument(id);
  if (!doc || !(await peutLireLeDocument(s, doc))) notFound();
  const fichier = `/api/documents/${doc.id}`;

  return (
    <div className={styles.wrap}>
      <Link href="/moi/documents" className={styles.back}>
        ← {t("Mes documents")}
      </Link>
      <div className={styles.head}>
        <div>
          <div className="eyebrow">{t(DOC_LABEL[doc.type])}</div>
          <h1 className="display mono">{doc.number}</h1>
          <p className={styles.lead}>{t("Établi le {d}.", { d: fmtDateTime(doc.createdAt) })}</p>
        </div>
        <div className={styles.actions}>
          <a className="btn primary sm" href={`${fichier}?telecharger=1`}>
            {t("Télécharger le PDF")}
          </a>
          <a className="btn sm" href={fichier} target="_blank" rel="noreferrer">
            {t("Ouvrir à part")}
          </a>
        </div>
      </div>

      {/* « object » plutôt qu'« iframe » : son contenu de repli s'affiche quand
          le navigateur ne sait pas rendre un PDF en place, ce qui est le cas de
          beaucoup de téléphones. Le lecteur voit alors quoi faire, au lieu d'un
          cadre vide. */}
      <object className={styles.visionneuse} data={fichier} type="application/pdf" aria-label={`${t(DOC_LABEL[doc.type])} ${doc.number}`}>
        <div className={styles.repli}>
          <p>{t("Votre navigateur n'affiche pas les PDF dans la page.")}</p>
          <a className="btn primary" href={`${fichier}?telecharger=1`}>
            {t("Télécharger le PDF")}
          </a>
        </div>
      </object>
    </div>
  );
}
