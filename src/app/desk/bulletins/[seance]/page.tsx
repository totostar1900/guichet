import Link from "next/link";
import { notFound } from "next/navigation";
import { DeskNav } from "@/components/DeskNav";
import { getT } from "@/i18n/server";
import { Rapport } from "./Rapport";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
/* Reprendre le PDF et le repasser au lecteur demande environ quatre
   secondes : c'est une page qu'on ouvre rarement et délibérément. */
export const maxDuration = 60;

/**
 * LE RAPPORT D'UNE SÉANCE, EN PAGE ENTIÈRE.
 *
 * Depuis le tableau, une route interceptée l'ouvre en tiroir sans quitter
 * la liste. Ici, c'est l'ouverture directe : un lien collé dans un message,
 * un signet, un rechargement. Les deux rendent le même corps.
 */
export default async function RapportPage({ params }: { params: Promise<{ seance: string }> }) {
  const t = await getT();
  const { seance } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(seance)) notFound();

  return (
    <>
      <DeskNav current="/desk/bulletins" />
      <div className={styles.head}>
        <div>
          <h1>
            {t("Séance du {d}", { d: seance })}
          </h1>
          <p className="muted">
            {t("Ce rapport n'est pas enregistré : il est refait à chaque ouverture, en reprenant le PDF et en le repassant au lecteur d'aujourd'hui. Rien n'est écrit en base, et c'est pour cela qu'on peut l'ouvrir sans y penser.")}
          </p>
        </div>
        <Link className="btn sm" href="/desk/bulletins">
          ← {t("Tous les bulletins")}
        </Link>
      </div>
      <Rapport seance={seance} />
    </>
  );
}
