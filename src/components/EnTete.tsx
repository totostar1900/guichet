import { LienRetour } from "./mobile/Glissement";
import styles from "./EnTete.module.css";

/**
 * L'EN-TÊTE D'UNE PAGE : QUATRE CRÉNEAUX, TOUJOURS DANS LE MÊME ORDRE.
 *
 * Relevé du 24 octobre 2026 sur treize pages (ETALON.md) : le créneau qui
 * précède le titre portait TROIS choses différentes — un sur-titre de
 * catégorie, un fil d'Ariane, un lien de retour — et il était vide sur six
 * pages. Trois grammaires pour un seul emplacement : le lecteur ne peut rien y
 * apprendre, puisque ce qu'il y trouve change de nature d'une page à l'autre.
 *
 * LES QUATRE CRÉNEAUX, et un seul genre par créneau :
 *
 *   RETOUR — un cran en arrière, et rien d'autre. Jamais un fil d'Ariane :
 *   « Portefeuille › Sécurité » dit la même chose en plus long, et c'était le
 *   seul de l'application.
 *
 *   SUR-TITRE — OÙ je suis : la section, la famille, le rayon. Jamais un lien,
 *   jamais un chemin.
 *
 *   TITRE — ce qu'EST cette page, à « --t-8 ». C'est son nom, pas une phrase :
 *   « /titres » titrait une phrase de cinquante-quatre signes, qu'il fallait
 *   composer à 16 px pour qu'elle tienne.
 *
 *   PHRASE — ce qu'on y TROUVE, en une phrase. Une seule.
 *
 * Chacun est facultatif, aucun ne change de place. Écrit page par page, cet
 * en-tête avait dérivé en trois ; écrit ici, il ne peut plus.
 */
export function EnTete({
  retour,
  surTitre,
  titre,
  reference,
  phrase,
  aCote,
}: {
  /** Un cran en arrière. Omis sur une racine de siège, où il n'y a rien au-dessus. */
  retour?: { href: string; mot: string };
  /** Où l'on est : la section qui contient cette page. */
  surTitre?: string;
  /** Le nom de la page. */
  titre: string;
  /**
   * LE NOM DE LA PAGE EST UNE RÉFÉRENCE, et se lit donc à chasse fixe.
   *
   * Deux pages en avaient besoin le 24 octobre 2026 — un ordre (`INT-…`) et un
   * document (son numéro) — et toutes deux écrivaient `display mono` sur leur
   * propre `h1`. Un numéro à chasse variable se relit mal : c'est pourtant ce
   * qu'on recopie au téléphone ou dans un virement, chiffre par chiffre.
   *
   * CE N'EST PAS UNE ÉCHAPPATOIRE À CLASSES. Rien d'autre que ce booléen ne
   * passe : ouvrir le `h1` à une classe quelconque rendrait à chaque page le
   * droit de redécider sa fonte et sa taille, c'est-à-dire exactement les sept
   * tailles de titre que cet en-tête a réunies.
   */
  reference?: boolean;
  /** Ce qu'on y trouve, en une phrase. */
  phrase?: React.ReactNode;
  /**
   * CE QUI SE POSE EN FACE DU TITRE, et jamais dessous : un chiffre de tête,
   * un bouton d'édition, un « en bref ». Sous le titre, il repousse d'un cran
   * le début de la liste, qui est ce pour quoi on vient ; en face, il ne coûte
   * aucune hauteur. C'est la raison qu'avait écrite la page des fonds, et elle
   * vaut pour les trois listes.
   */
  aCote?: React.ReactNode;
}) {
  return (
    <>
      {retour && (
        <LienRetour href={retour.href} className={styles.retour}>
          ← {retour.mot}
        </LienRetour>
      )}
      <header className={`${styles.tete} ${aCote ? styles.avecCote : ""}`}>
        <div className={styles.mots}>
          {surTitre && <div className="eyebrow">{surTitre}</div>}
          <h1 className={reference ? "display mono" : "display"}>{titre}</h1>
          {phrase && <p className={styles.phrase}>{phrase}</p>}
        </div>
        {aCote}
      </header>
    </>
  );
}
