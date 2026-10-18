import Link from "next/link";
import styles from "./DeskNav.module.css";
import { BarreGelee } from "./BarreGelee";
import { DeclarerBadges } from "./ColonneStore";
import { getT } from "@/i18n/server";
import { DESK_GROUPS } from "@/lib/desk-groupes";

/**
 * LA TABLE A DÉMÉNAGÉ DANS `lib/desk-groupes`, et la page a dit pourquoi.
 *
 * Elle vivait ici, dans un composant SERVEUR qui lit les traductions avec
 * `next/headers`. La colonne de gauche est un composant CLIENT : en important
 * la table depuis ce fichier, elle tirait DeskNav tout entier dans le paquet
 * du navigateur, et le serveur de développement a répondu 500 avec le message
 * exact.
 *
 * On la réexporte pour ne casser ni les essais ni un appel existant.
 */
export { DESK_GROUPS, DESK_TABS } from "@/lib/desk-groupes";
/**
 * The desk's navigation: four groups instead of thirteen tabs. Badges count
 * what waits on a page; the active page is filled. On a phone the row scrolls.
 */
/**
 * LES SIX GROUPES RÉPONDENT TOUS À LA MÊME QUESTION : quel travail suis-je en
 * train de faire ?
 *
 * Les quatre précédents n'y répondaient pas ensemble. « Opérations » disait ce
 * que je fais, « Marché » disait de quoi ça parle : deux questions dans une
 * même barre, donc un onglet pouvait appartenir aux deux ou à aucun, et
 * c'était l'auteur du jour qui tranchait. « Marché » avait ainsi absorbé douze
 * onglets sur trente et un, dont un banc d'essai WhatsApp.
 *
 * AUCUNE ADRESSE NE BOUGE ici : seul change le groupe où un onglet se range.
 * Un lien, un signet ou un renvoi de contrôle ne peut donc pas casser.
 *
 * « Vue client » garde ses quatre onglets plutôt que de devenir une page de
 * menu : une page intermédiaire aurait coûté un clic à chaque consultation
 * pour économiser trois lignes de barre. Elle ramène /desk/comparer, qui
 * existait sans figurer dans aucune barre, donc inatteignable autrement qu'en
 * tapant l'adresse.
/**
 * LA BARRE RESTE, ET ELLE PUBLIE SES CHIFFRES À LA COLONNE.
 *
 * Au-delà de 1040 pixels, la navigation vit à gauche et cette barre est
 * masquée par la feuille de style. Mais ses PASTILLES sont calculées ici, page
 * par page, par celle qui compte ce qui l'attend : la colonne, qui vit
 * au-dessus dans l'arbre, ne peut pas les connaître.
 *
 * Elle les déclare donc au magasin, et la colonne les lit. Ainsi les
 * trente-huit pages du desk n'ont pas une ligne à changer, et il n'existe
 * toujours qu'UN endroit où un compte est calculé.
 */
export async function DeskNav({ current, badges = {} }: { current: string; badges?: Record<string, number> }) {
  const t = await getT();
  return (
    <>
    <DeclarerBadges cle={`desk:${current}`} badges={badges} />
    <BarreGelee className={styles.nav} aria-label="Desk" data-coach="nav">
      {DESK_GROUPS.map((g) => (
        <div key={g.label} className={styles.group}>
          <span className={styles.label}>{t(g.label)}</span>
          <div className={styles.tabs}>
            {g.tabs.map(([href, label]) => (
              <Link key={href} href={href} aria-current={href === current ? "page" : undefined}>
                {t(label)}
                {badges[href] ? <span className={styles.badge}>{badges[href]}</span> : null}
              </Link>
            ))}
          </div>
        </div>
      ))}
      <Link href="/desk/guide" className={styles.guide} aria-current={current === "/desk/guide" ? "page" : undefined}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5V14M12 17h.01" />
        </svg>
        {t("Guide")}
      </Link>
      </BarreGelee>
    </>
  );
}
