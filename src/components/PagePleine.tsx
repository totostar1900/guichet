import { FermerLaPage } from "./FermerLaPage";
import styles from "./PagePleine.module.css";

/**
 * UNE PAGE PLEINE : TOUT L'ÉCRAN, ET LA CROIX POUR SEULE SORTIE.
 *
 * Demandée le 31 octobre 2026 pour l'horloge et l'étoile de la barre : « une
 * page avec sa croix pour refermer ». Même idée que les « en bref » du 29
 * octobre (Sheet « plein ») : un texte ou une liste qu'on veut lire occupe
 * l'écran, et la sortie est un seul geste, au même endroit.
 *
 * C'est une PAGE et non une feuille : elle a une adresse qu'on envoie, un
 * retour système qui marche, un titre d'onglet. La croix recule comme la
 * flèche de la barre (« reculer »), et mène à l'accueil quand rien ne précède.
 */
export function PagePleine({ titre, icone, fermer, children }: { titre: string; icone: React.ReactNode; fermer: string; children: React.ReactNode }) {
  return (
    <div className={styles.plein} role="region" aria-label={titre}>
      <header className={styles.tete}>
        <span className={styles.icone} aria-hidden="true">
          {icone}
        </span>
        <h1>{titre}</h1>
        <FermerLaPage label={fermer} />
      </header>
      <div className={styles.corps}>{children}</div>
    </div>
  );
}
