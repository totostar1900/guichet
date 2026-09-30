import { getT } from "@/i18n/server";
import styles from "./BandeInstruments.module.css";

/** Une ligne de la bande : ce qu'elle est, jamais ce qu'elle vaut. */
export type LigneVitrine = {
  emetteur: string;
  /**
   * La nature et la durée restent DEUX champs, et c'est le piège qu'on évite :
   * « Obligation du Trésor, 1 an » composé puis traduit ne trouve aucune clef,
   * et le résolveur n'en rattrape qu'une moitié. Chaque morceau porte la
   * sienne, et la virgule est du texte.
   */
  nature: string;
  /** « 26 semaines », « 7 ans », ou rien quand la ligne n'a pas d'échéance. */
  duree: string;
  /** Où elle se traite : adjudication, cote, OPCVM. */
  marche: string;
  famille: "tresor" | "cote" | "fonds";
};

/**
 * La bande d'instruments de l'accueil public.
 *
 * ELLE VEND EXACTEMENT CE QU'ELLE RETIENT. Les lignes existent vraiment et
 * défilent à plat, sans carte ni ombre ; la colonne des prix dit « après
 * connexion » et ne porte qu'un signe. Un visiteur voit donc qu'il y a un
 * marché, et que le chiffre est de l'autre côté de la porte.
 *
 * Trois contraintes tiennent l'animation :
 *
 *   ELLE NE COÛTE RIEN. Une seule transformation CSS sur une liste doublée,
 *   aucun script par image. Le téléphone a déjà été ralenti une fois par des
 *   effets qui semblaient gratuits.
 *
 *   ELLE S'ARRÊTE. Au survol, et pour qui a demandé moins de mouvement dans
 *   son système.
 *
 *   ELLE NE PORTE AUCUNE INFORMATION SEULE. Ce qui défile est décoratif au
 *   sens strict : rien ici n'est nécessaire pour comprendre la page, et la
 *   liste entière reste lisible au clavier comme au lecteur d'écran, arrêtée.
 */
export async function BandeInstruments({ lignes }: { lignes: LigneVitrine[] }) {
  const t = await getT();
  // Doublée, pour que la translation de la moitié de la hauteur reboucle sans saut.
  const boucle = [...lignes, ...lignes];
  const pastille: Record<LigneVitrine["famille"], string> = { tresor: styles.tresor, cote: styles.cote, fonds: styles.fonds };

  return (
    <section className={styles.bande}>
      <div className={styles.tete}>
        <span className={styles.etiquette}>{t("Sur le marché en ce moment")}</span>
        <small>{t("Les prix, les rendements et le calendrier se lisent une fois connecté.")}</small>
      </div>
      <div className={styles.colonnes}>
        <span>{t("ÉMETTEUR")}</span>
        <span>{t("LIGNE")}</span>
        <span>{t("MARCHÉ")}</span>
        <span className={styles.verrou}>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M6 11V8a6 6 0 0 1 12 0v3" />
            <rect x="4" y="11" width="16" height="9" />
          </svg>
          {t("APRÈS CONNEXION")}
        </span>
      </div>
      <div className={styles.fenetre}>
        <div className={styles.rouleau}>
          {boucle.map((l, i) => (
            <div className={styles.ligne} key={`${l.emetteur}-${l.nature}-${l.duree}-${i}`} aria-hidden={i >= lignes.length ? "true" : undefined}>
              <span className={styles.qui}>
                <i className={pastille[l.famille]} />
                <b>{l.emetteur}</b>
              </span>
              <span className={styles.quoi}>
                {t(l.nature)}
                {l.duree ? `, ${t(l.duree)}` : ""}
              </span>
              <span className={styles.ou}>{t(l.marche)}</span>
              <span className={styles.retenu} aria-label={t("Chiffre réservé aux titulaires d'un compte")}>
                · · ·
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
