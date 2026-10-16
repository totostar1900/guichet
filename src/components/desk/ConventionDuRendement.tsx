import { getT } from "@/i18n/server";
import { choisirConvention } from "@/lib/market/convention-actions";
import { lireConvention } from "@/lib/market/convention";
import type { Convention } from "@/lib/market/yield";
import styles from "./ConventionDuRendement.module.css";

/**
 * LE COMMUTATEUR DE CONVENTION, ÉCRIT UNE FOIS.
 *
 * Trois surfaces du desk affichent un rendement : le tableau des
 * adjudications, la courbe, et la fiche d'une séance. Elles ne portent pas
 * trois copies de ce `<select>` : elles portent ce composant, et le choix vit
 * dans un témoin que le serveur relit à chaque rendu, donc il les suit toutes
 * d'un coup.
 *
 * SANS SCRIPT IL MARCHE AUSSI. Le bouton part en changeant quand le script a
 * tourné, et reste cliquable sinon : un réglage dont le seul moyen de partir
 * est un écouteur est un réglage qui ne part pas chez quelqu'un.
 */
export async function ConventionDuRendement() {
  const t = await getT();
  const convention = await lireConvention();
  return (
    <form action={choisirConvention} className={styles.boite}>
      <label className={styles.etiquette} htmlFor="convention-rdt">
        {t("Rendement calculé")}
      </label>
      {/* LA CLEF FORCE UN NOUVEAU CHAMP À CHAQUE CHANGEMENT.
          `defaultValue` n'agit qu'au montage : après l'action, React
          réutilisait le même `select` et le menu continuait d'afficher
          « Guichet » alors que les chiffres de la page étaient déjà ceux de
          la BEAC. Un réglage qui ment sur son propre état est pire qu'un
          réglage absent. */}
      <select key={convention} id="convention-rdt" name="convention" defaultValue={convention} className={styles.choix}>
        <option value="guichet">{t("à la façon du Guichet")}</option>
        <option value="beac">{t("à la façon de la BEAC")}</option>
      </select>
      <button type="submit" className="btn sm">
        {t("Appliquer")}
      </button>
    </form>
  );
}

/**
 * CE QUE LA PAGE DIT QUAND ELLE NE PORTE PAS LE COMMUTATEUR.
 *
 * Un rendement calculé autrement que par défaut, sans que la page le dise,
 * serait un chiffre que personne ne peut défendre.
 */
export async function NoteDeConvention({ convention }: { convention: Convention }) {
  if (convention === "guichet") return null;
  const t = await getT();
  return (
    <p className={styles.note}>
      {t("Les rendements de cette page sont calculés à la façon de la BEAC : escompte divisé par un moins escompte fois la durée. La mesure du Guichet, plus rigoureuse, compte l'escompte en exact/360 et capitalise en exact/365.")}
    </p>
  );
}
