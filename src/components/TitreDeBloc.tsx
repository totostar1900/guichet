import Link from "next/link";
import { getT } from "@/i18n/server";
import styles from "./TitreDeBloc.module.css";

/**
 * LE TITRE D'UN BLOC DE L'ACCUEIL : sobre, une étiquette en capitales (A1, 2 novembre 2026), le titre EST le lien.
 *
 * « Tout voir » à droite dit la porte pour qui ne devine pas qu'un titre se touche. Un seul lien vers la même
 * page, deux manières de le lire : la cible du doigt est la ligne entière.
 */
export async function TitreDeBloc({ id, titre, href, tout = "Tout voir", etiquette, fort = false }: { id?: string; titre: string; href?: string; tout?: string; /** Une pastille après le titre (« à signer »). */ etiquette?: React.ReactNode; /** Le titre d'une section de la fiche (1,14 rem, gras, encre pleine) et non l'étiquette en capitales de l'Accueil. */ fort?: boolean }) {
  const t = await getT();
  const titreNu = (
    <h2 id={id} className={`${styles.titre} ${fort ? styles.fort : ""}`}>
      {t(titre)}
    </h2>
  );
  /* SANS ADRESSE, le titre ne mène nulle part : un bloc qui n'a pas de liste complète (« Mon espace », « Vous pouvez aussi ») ne dit pas « Tout voir ». */
  if (!href) {
    return (
      <div className={styles.tete}>
        {titreNu}
        {etiquette}
      </div>
    );
  }
  return (
    <Link className={styles.tete} href={href}>
      {titreNu}
      {etiquette}
      <span className={styles.tout}>{t(tout)}</span>
    </Link>
  );
}
