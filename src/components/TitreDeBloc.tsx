import Link from "next/link";
import { getT } from "@/i18n/server";
import styles from "./TitreDeBloc.module.css";

/**
 * LE TITRE D'UN BLOC DE L'ACCUEIL EST HORS DE LA CARTE, FORT, AVEC UN TRAIT JAUNE À SA GAUCHE (17 novembre 2026, planche « Accueil », 1A).
 * Avant : un titre DANS la carte (8 novembre, 1B · 2A), dont le titre (17,25 px · 700) et la première rangée (15 px · 600) avaient la même encre ; avant lui, une étiquette grise en capitales
 * de 12 px. La carte ne porte plus que des rangées ; le titre est le même partout, y compris sur Titres, Fonds et Adjudications. La fiche (`fort`) garde son titre sans trait.
 *
 * Le titre EST le lien. « Tout voir › » en or à droite dit la porte pour qui ne devine pas qu'un titre se touche : la cible du doigt est la ligne entière, d'au moins 44 px.
 */
export async function TitreDeBloc({ id, titre, href, tout = "Tout voir", etiquette, fort = false }: { id?: string; titre: string; href?: string; tout?: string; /** Une pastille après le titre (« à signer »). */ etiquette?: React.ReactNode; /** Le titre d'une section de la fiche (sans le trait jaune de l'Accueil). */ fort?: boolean }) {
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
      <span className={styles.tout}>{t(tout)}{fort ? "" : " ›"}</span>
    </Link>
  );
}
