import Link from "next/link";
import { getT } from "@/i18n/server";
import styles from "./TitreDeBloc.module.css";

/**
 * LE TITRE D'UN BLOC DE L'ACCUEIL : sobre, une étiquette en capitales (A1, 2 novembre 2026), le titre EST le lien.
 *
 * « Tout voir » à droite dit la porte pour qui ne devine pas qu'un titre se touche. Un seul lien vers la même
 * page, deux manières de le lire : la cible du doigt est la ligne entière.
 */
export async function TitreDeBloc({ id, titre, href, tout = "Tout voir" }: { id?: string; titre: string; href: string; tout?: string }) {
  const t = await getT();
  return (
    <Link className={styles.tete} href={href}>
      <h2 id={id} className={styles.titre}>
        {t(titre)}
      </h2>
      <span className={styles.tout}>{t(tout)}</span>
    </Link>
  );
}
