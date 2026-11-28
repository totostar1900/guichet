import { getT } from "@/i18n/server";
import { DemarrageTermine } from "./DemarrageTermine";
import styles from "./EcranDeDemarrage.module.css";

/**
 * L'ÉCRAN DE DÉMARRAGE ANIMÉ (28 novembre 2026, le client, capture à l'appui : « on ne voit que le logo » ; « un logo statique : rajouter une animation du logo ou en fond d'écran pour signifier
 * le chargement en cours des données »).
 *
 * L'ÉCRAN D'ANDROID (l'icône sur fond uni) est dessiné par le système et NE PEUT PAS BOUGER : il reste jusqu'à la première image de la page. Cette pièce prend le relais dès cette première
 * image, au même endroit et avec le même logo, et le fait vivre : le logo respire, un trait d'or le traverse comme une barre de progression, un halo d'or pulse derrière. Rien n'est écrit
 * en dur de ce que la page contiendra.
 *
 * ELLE N'EXISTE QUE POUR L'APPLICATION INSTALLÉE (`display-mode: standalone`) : dans un navigateur, le texte de la page s'affiche déjà avant le script, et le couvrir le retarderait.
 * Elle part à la fin de l'hydratation (`DemarrageTermine` pose `data-pret` sur la page) ; et si l'hydratation ne vient jamais, elle s'efface d'elle-même après 25 s, pour laisser lire la
 * page rendue par le serveur plutôt que de rester pour toujours. Aucun script : l'animation est du CSS, qui s'arrête pour qui a demandé moins de mouvement.
 */
export async function EcranDeDemarrage() {
  const t = await getT();
  return (
    <>
      <div className={styles.demarrage} role="status" aria-busy="true" data-demarrage="">
        <span className={styles.halo} aria-hidden="true" />
        <svg className={styles.logo} viewBox="0 0 512 512" width="120" height="120" aria-hidden="true">
          <rect width="512" height="512" rx="96" fill="#0b2545" />
          <text x="256" y="330" textAnchor="middle" fontFamily="Manrope, Segoe UI, Arial, sans-serif" fontWeight="800" fontSize="300" fill="var(--marque-or)">
            G
          </text>
          <rect className={styles.trait} x="150" y="392" width="212" height="18" rx="9" fill="var(--marque-or)" />
        </svg>
        <span className={styles.texte}>{t("Chargement…")}</span>
      </div>
      <DemarrageTermine />
    </>
  );
}
