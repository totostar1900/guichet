import { EnTete } from "@/components/EnTete";
import { Glissement } from "@/components/mobile/Glissement";
import { TableauDeBord } from "@/components/gestion/TableauDeBord";
import { getT } from "@/i18n/server";
import { fmtDate } from "@/lib/format";
import { requireGestionnaire, tableauDuGestionnaire } from "@/lib/gestionnaire-donnees";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Mes fonds") };
}

/**
 * L'ESPACE GESTIONNAIRE : LE TABLEAU DE BORD (28 novembre 2026, planche « Espace gestionnaire », 1B · 2C). Les fonds du gestionnaire, ce qui vient de NOS clients, jour par jour, par fonds ou au global, en
 * courbe, en aires ou en barres. Rien n'y désigne un client ni un ordre, et rien n'y dit ce que la maison reçoit : la direction seule lit cela, ailleurs.
 */
export default async function GestionPage() {
  const { acces } = await requireGestionnaire();
  const [t, tableau] = await Promise.all([getT(), tableauDuGestionnaire(acces)]);
  return (
    <Glissement>
    <main className={styles.page}>
      <EnTete titre={t("Mes fonds")} phrase={t("Ce que nos clients détiennent dans vos fonds, jour par jour : l'encours, les souscriptions, les rachats, la valeur liquidative et le nombre de porteurs.")} />
      {tableau.fonds.length === 0 ? (
        <p className={styles.vide}>{t("Aucun fonds n'est rattaché à votre accès : {s}. Écrivez-nous pour le faire corriger.", { s: acces.gestionnaires.join(", ") })}</p>
      ) : (
        <TableauDeBord fonds={tableau.fonds.map((f) => ({ id: f.id, nom: f.nom, vl: f.vl, serie: f.serie }))} global={tableau.global.serie} />
      )}
      <p className={styles.note}>{t("Chiffres de nos clients seulement, arrêtés au {d}. Un jour sans valeur liquidative connue n'est pas valorisé. Le nombre de porteurs n'est dit qu'à partir de cinq. Aucune donnée individuelle n'est montrée.", { d: fmtDate(tableau.au, true) })}</p>
    </main>
    </Glissement>
  );
}
