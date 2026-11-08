import Link from "next/link";
import { getT } from "@/i18n/server";
import styles from "./TitreDeBloc.module.css";

/**
 * LE TITRE D'UN BLOC DE L'ACCUEIL EST UN BANDEAU DE LA CARTE (8 novembre 2026, choix 1B · 2A) : un vrai titre (--t-6, casse normale), une ligne de 1 px dessous, et « Tout voir › » en or à droite, comme
 * la page Marché. Le composant qui le porte met le bandeau DANS sa carte (fond, bord et rayon sont à la section, pas aux rangées). Avant : une étiquette grise en capitales de 12 px posée à plat
 * au-dessus de la carte (A1, 2 novembre 2026). La fiche (`fort`) garde son titre à plat.
 *
 * Le titre EST le lien.
 *
 * « Tout voir » à droite dit la porte pour qui ne devine pas qu'un titre se touche. Un seul lien vers la même
 * page, deux manières de le lire : la cible du doigt est la ligne entière.
 */
export async function TitreDeBloc({ id, titre, href, tout = "Tout voir", etiquette, fort = false, bandeau = !fort }: { id?: string; titre: string; href?: string; tout?: string; /** Une pastille après le titre (« à signer »). */ etiquette?: React.ReactNode; /** Le titre d'une section de la fiche (1,14 rem, gras, encre pleine) et non l'étiquette en capitales de l'Accueil. */ fort?: boolean; /** Le bandeau d'une carte (titre, ligne dessous, lien de 44 px) : par défaut tout titre qui n'est pas celui d'une fiche. */ bandeau?: boolean }) {
  const t = await getT();
  const titreNu = (
    <h2 id={id} className={`${styles.titre} ${fort ? styles.fort : ""}`}>
      {t(titre)}
    </h2>
  );
  /* SANS ADRESSE, le titre ne mène nulle part : un bloc qui n'a pas de liste complète (« Mon espace », « Vous pouvez aussi ») ne dit pas « Tout voir ». */
  if (!href) {
    return (
      <div className={`${styles.tete} ${bandeau ? styles.bandeau : ""}`}>
        {titreNu}
        {etiquette}
      </div>
    );
  }
  return (
    <Link className={`${styles.tete} ${bandeau ? styles.bandeau : ""}`} href={href}>
      {titreNu}
      {etiquette}
      <span className={styles.tout}>{t(tout)}{bandeau ? " ›" : ""}</span>
    </Link>
  );
}
