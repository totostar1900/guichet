import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { SourceViewer } from "@/components/SourceViewer";
import styles from "../../../documents/[id]/page.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Mon ordre") };
}

/**
 * L'ORDRE SE LIT AVANT D'ÊTRE SIGNÉ, ET DANS L'APP.
 *
 * Tant qu'il n'est pas signé, il est rendu à la volée et ne consomme aucun
 * numéro du registre : relire trois fois ne doit pas produire trois pièces.
 * Une fois signé, c'est le vrai document qu'on lit, celui qui porte la
 * signature.
 */
export default async function LireOrdrePage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const { id } = await params;
  const s = await requireSession(`/moi/ordres/${id}/lire`);
  const intent = (await repo().listIntents()).find((x) => x.id === id);
  if (!intent || intent.clientId !== s.userId) notFound();
  const src = intent.orderDocId ? `/api/documents/${intent.orderDocId}` : `/api/documents/ordre/${intent.id}`;

  return (
    <div className={styles.wrap}>
      <Link href={`/moi/ordres/${intent.id}`} className={styles.back}>
        ← {t("Mon ordre")}
      </Link>
      <div className={styles.head}>
        <div>
          <div className="eyebrow">{intent.signedAt ? t("Ordre signé") : t("Avant signature")}</div>
          <h1 className="display mono">{intent.ref}</h1>
          <p className={styles.lead}>{intent.signedAt ? t("Le document tel qu'il a été signé.") : t("Le texte complet, tel que vous le signerez. Rien n'est engagé tant que vous n'avez pas saisi le code.")}</p>
        </div>
      </div>
      <div className={styles.visionneuse}>
        <SourceViewer src={src} title={`${t("Ordre")} ${intent.ref}`} fill />
      </div>
    </div>
  );
}
