import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getT } from "@/i18n/server";
import { Rapport } from "../../[seance]/Rapport";
import { Tiroir } from "./Tiroir";
import styles from "./tiroir.module.css";

export const dynamic = "force-dynamic";
/* Le rapport reprend le PDF et le repasse au lecteur : quatre secondes. */
export const maxDuration = 60;

/**
 * LE RAPPORT, INTERCEPTÉ DEPUIS LA LISTE.
 *
 * Même corps que la page entière, dans un tiroir. L'attente est explicite :
 * reprendre un PDF et le relire demande quelques secondes, et un tiroir qui
 * s'ouvre vide pendant ce temps donne l'impression d'une panne. Suspense rend
 * le tiroir tout de suite et remplit après, plutôt qu'un « loading.tsx » qui
 * retiendrait la navigation entière.
 */
export default async function RapportIntercepte({ params }: { params: Promise<{ seance: string }> }) {
  const t = await getT();
  const { seance } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(seance)) notFound();

  return (
    <Tiroir titre={t("Séance du {d}", { d: seance })}>
      <Suspense
        fallback={
          <p className={styles.attente}>
            {t("Le document est repris chez sa source et repassé au lecteur : quelques secondes. Rien n'est écrit en base.")}
          </p>
        }
      >
        <Rapport seance={seance} />
      </Suspense>
    </Tiroir>
  );
}
