import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { peutLireLeDocument } from "@/lib/documents/acces";
import { DOC_LABEL } from "@/lib/documents/registry";
import { fmtDateTime } from "@/lib/format";
import { getT } from "@/i18n/server";
import { SourceViewer } from "@/components/SourceViewer";
import { SortiesDuDocument } from "./Sorties";
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
        <SortiesDuDocument fichier={fichier} nom={doc.number} />
      </div>

      {/* LA PAGE EST PEINTE ICI, ET C'EST LA SEULE FAÇON QUI TIENNE.
          « object » et « iframe » s'en remettent à la visionneuse du système :
          sur un téléphone elle n'existe pas, et dans l'app installée, qui tourne
          en standalone, l'ouvrir emporte l'app. Mesuré le 8 octobre 2026 : le
          cadre restait vide, « ouvrir à part » faisait disparaître l'app, et le
          téléchargement ne donnait aucune notification. Trois issues, trois
          impasses.
          SourceViewer peint le PDF lui-même avec pdf.js, sur un canevas : rien
          ne sort de la page, donc rien ne peut s'y perdre. La maison s'en sert
          déjà pour les communiqués des Trésors. */}
      <div className={styles.visionneuse}>
        <SourceViewer src={fichier} title={`${t(DOC_LABEL[doc.type])} ${doc.number}`} fill />
      </div>
    </div>
  );
}
