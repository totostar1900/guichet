import { formeDeLaCadence, type Cadence as Chiffres } from "@/lib/domain/cadence";
import styles from "./Cadence.module.css";

/**
 * DOUZE BARRES, LA CADENCE D'UN CLIENT SUR DOUZE MOIS.
 *
 * La colonne que la maquette du 10 octobre 2026 dessinait au répertoire. Ce
 * qu'elle apporte et qu'aucun nombre n'apporte : un score dit OÙ EN EST un
 * client, douze barres disent DANS QUEL SENS il va, et c'est le sens qui
 * décide d'un appel.
 *
 * AUX JETONS, PAS AUX HEXADÉCIMAUX DE LA MAQUETTE. Elle est peinte en dur en
 * sombre (fond #0C1420, or #C9A227) et n'a aucune variante claire, alors que
 * le desk s'affiche en clair par défaut. Prendre ses couleurs au mot donnerait
 * une colonne sombre au milieu d'une page claire, sans second thème. La
 * structure et le contenu à la virgule, les couleurs par les jetons.
 *
 * LA PHRASE N'EST PAS UN ORNEMENT. Pour un lecteur d'écran, douze barres sans
 * elle sont un dessin muet : c'est le seul contenu de la colonne. La maquette
 * la portait sur chaque série, et elle se calcule plutôt que de s'écrire.
 */
export function Cadence({ c, titre }: { c: Chiffres; titre?: string }) {
  const phrase = formeDeLaCadence(c);
  return (
    <div className={styles.cadence} role="img" aria-label={titre ? `${titre} : ${phrase}` : phrase} title={phrase}>
      {c.mois.map((n, i) => (
        <span
          key={i}
          className={n > 0 ? styles.barre : styles.vide}
          /* La hauteur est une part du plafond DE CETTE LIGNE : un plafond
             commun écraserait tout le monde dès qu'un institutionnel passe
             quatre cents gestes dans un mois. */
          style={{ height: n > 0 ? `${Math.max(12, Math.round((n / c.plafond) * 100))}%` : undefined }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
