import { logout } from "@/app/connexion/actions";
import { getT } from "@/i18n/server";
import { COMPANY } from "@/lib/config";
import styles from "./EnteteGestion.module.css";

/** La bande du haut de l'espace gestionnaire : la maison, le nom de l'espace, la personne, la sortie. Rien d'autre : aucune porte vers le site du client. */
export async function EnteteGestion({ nom }: { nom?: string }) {
  const t = await getT();
  return (
    <header className={styles.haut}>
      <span className={styles.marque}>
        <b>{COMPANY.name.toUpperCase()}</b>
        <em>{t("Espace gestionnaire")}</em>
      </span>
      <span className={styles.droite}>
        {nom && <span className={styles.nom}>{nom}</span>}
        <form action={logout}>
          <button type="submit" className={styles.sortie}>
            {t("Se déconnecter")}
          </button>
        </form>
      </span>
    </header>
  );
}
