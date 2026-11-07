import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { fmtDate } from "@/lib/format";
import { ImportOja } from "../ImportOja";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Import des exports OJA" };

/**
 * LA PAGE DE L'IMPORT ET DE L'ANALYSE DES EXPORTS OJA (7 novembre 2026, demande du dirigeant : « une page dédiée à l'import et à l'analyse du Excel, comme celle du bulletin »).
 *
 * L'import vivait au-dessus de la liste des séances et prenait la moitié d'un écran de quatorze pouces. Il a maintenant sa page : on y dépose les exports, on lit l'aperçu
 * (nouvelles séances, concordantes, écarts, ignorées), on tranche, on importe, et on retrouve le journal de tous les imports. La page des adjudications ne garde que la
 * liste et la séance.
 */
export default async function ImportOjaPage() {
  await requireDesk("/desk/adjudications/import");
  const t = await getT();
  const imports = await repo().listOjaImports();

  return (
    <>
      <DeskNav current="/desk/adjudications/import" />
      <main className={styles.page}>
        <header className={styles.tete}>
          <h1>{t("Import des exports OJA")}</h1>
          <p className={styles.sous}>
            {t("Déposez les exports OJA pour comparer les séances du Desk, combler celles qui manquent et trancher les écarts entre le communiqué et l'Excel. Rien n'est écrit avant « Importer ».")}{" "}
            <Link href="/desk/adjudications">{t("Retour aux séances")} →</Link>
          </p>
        </header>

        <ImportOja imports={imports} />

        <section className={styles.journal} aria-label={t("Journal des imports")}>
          <h2>{t("Journal des imports")}</h2>
          {imports.length === 0 ? (
            <p className={styles.sous}>{t("Aucun import pour le moment.")}</p>
          ) : (
            <div className={styles.tableau}>
              <table>
                <thead>
                  <tr>
                    <th>{t("Date")}</th>
                    <th>{t("Fichiers")}</th>
                    <th>{t("Par")}</th>
                    <th>{t("nouvelles séances")}</th>
                    <th>{t("concordantes")}</th>
                    <th>{t("écarts")}</th>
                    <th>{t("ignorées")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {imports.map((i) => (
                    <tr key={i.id}>
                      <td>{fmtDate(i.at)}</td>
                      <td>{i.fichiers.map((f) => f.nom).join(" · ")}</td>
                      <td>{i.by}</td>
                      <td>{i.nouvelles}</td>
                      <td>{i.concordantes}</td>
                      <td>{i.ecarts}</td>
                      <td>{i.ignorees}</td>
                      <td>{i.exclu ? <em className={styles.exclu}>{t("exclu")}</em> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
