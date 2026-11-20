import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { requireDesk } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { ChargerUnClasseur } from "./ChargerUnClasseur";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Charger un classeur" };
/* La lecture d'un classeur de trois cents lignes tient en quelques secondes ; la marge est celle des autres pages du desk qui lisent un fichier. */
export const maxDuration = 120;

/**
 * CHARGER UN CLASSEUR EXCEL (20 novembre 2026, le client : « le desk pourra créer les lignes via le scan des sites, le chargement manuel des PDF et celui du fichier Excel »).
 * Le modèle se télécharge ici (listes du jour), se remplit, se dépose, s'examine, puis seulement se charge.
 */
export default async function ChargementPage() {
  await requireDesk("/desk/a-valider/chargement");
  const t = await getT();
  return (
    <>
      <DeskNav current="/desk/a-valider" />
      <main className={styles.page}>
        <header className={styles.tete}>
          <h1>{t("Charger un classeur")}</h1>
          <p className={styles.sous}>
            {t("Lignes OTA, BTA, emprunts et introductions en bourse, résultats d'adjudication. Rien n'est écrit avant « Charger » ; les lignes arrivent dans « À valider », rien n'est publié.")}{" "}
            <Link href="/desk/a-valider">{t("Retour à « À valider »")} →</Link>
          </p>
        </header>
        <section className={styles.etape}>
          <h2>{t("1. Le modèle")}</h2>
          <p className={styles.sous}>{t("Les listes (pays, émetteurs) sont celles du registre d'aujourd'hui. Les colonnes vertes se calculent seules.")}</p>
          <a className="btn" href="/desk/a-valider/modele" download>
            {t("Télécharger le modèle")}
          </a>
        </section>
        <ChargerUnClasseur />
      </main>
    </>
  );
}
