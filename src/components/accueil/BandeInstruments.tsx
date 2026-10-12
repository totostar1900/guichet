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
 * LA BANDE D'INSTRUMENTS DE L'ACCUEIL PUBLIC.
 *
 * ELLE VEND EXACTEMENT CE QU'ELLE RETIENT. Les lignes existent vraiment et
 * défilent ; aucun prix ne paraît, et la phrase de tête dit où ils sont. Un
 * visiteur voit donc qu'il y a un marché, et que le chiffre est de l'autre
 * côté de la porte.
 *
 * ELLE DÉFILE À L'HORIZONTALE, ET À PLAT SUR LA PAGE. La version d'avant
 * faisait monter sept lignes dans une fenêtre de trois cent vingt pixels,
 * masquée en haut et en bas : un CADRE posé sur la page, et quatre colonnes
 * étirées sur toute la largeur d'un grand écran, l'émetteur séparé de sa
 * nature par un désert. Un ruban horizontal n'a ni cadre ni colonnes : il
 * traverse, et chaque ligne reste d'un seul tenant sous l'œil.
 *
 * TROIS CONTRAINTES TIENNENT L'ANIMATION, et elles n'ont pas changé.
 *
 *   ELLE NE COÛTE RIEN. Une seule transformation CSS sur une liste doublée,
 *   aucun script par image. Le téléphone a déjà été ralenti une fois par des
 *   effets qui semblaient gratuits.
 *
 *   ELLE S'ARRÊTE. Au survol, et pour qui a demandé moins de mouvement dans
 *   son système : la bande est alors simplement immobile, et lisible.
 *
 *   ELLE NE PORTE AUCUNE INFORMATION SEULE. Ce qui défile est décoratif au
 *   sens strict : rien ici n'est nécessaire pour comprendre la page.
 */
export async function BandeInstruments({ lignes }: { lignes: LigneVitrine[] }) {
  const t = await getT();
  /* Doublée, pour que la translation de la moitié de la LARGEUR reboucle sans
     saut visible. La seconde moitié est cachée aux lecteurs d'écran : elle ne
     dit rien de plus. */
  const pastille: Record<LigneVitrine["famille"], string> = { tresor: styles.tresor, cote: styles.cote, fonds: styles.fonds };

  const suite = (clone: boolean) =>
    lignes.map((l, i) => (
      <span className={styles.item} key={`${clone ? "b" : "a"}-${l.emetteur}-${l.nature}-${l.duree}-${i}`}>
        <i className={pastille[l.famille]} />
        <b>{l.emetteur}</b>
        <em>
          {t(l.nature)}
          {l.duree ? `, ${t(l.duree)}` : ""}
        </em>
        <small>{t(l.marche)}</small>
      </span>
    ));

  return (
    <section className={styles.bande} aria-label={t("Sur le marché en ce moment")}>
      <div className={styles.tete}>
        <span className={styles.etiquette}>{t("Sur le marché en ce moment")}</span>
        <small>{t("Les prix, les rendements et le calendrier se lisent une fois connecté.")}</small>
      </div>
      <div className={styles.piste}>
        <div className={styles.ruban}>
          <span className={styles.serie}>{suite(false)}</span>
          <span className={styles.serie} aria-hidden="true">
            {suite(true)}
          </span>
        </div>
      </div>
    </section>
  );
}
