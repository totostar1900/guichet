import Link from "next/link";
import styles from "./DeskNav.module.css";
import { getT } from "@/i18n/server";

/**
 * The desk's navigation: four groups instead of thirteen tabs. Badges count
 * what waits on a page; the active page is filled. On a phone the row scrolls.
 */
export const DESK_GROUPS: { label: string; tabs: [string, string][] }[] = [
  {
    label: "Opérations",
    tabs: [
      ["/desk", "Carnet"],
      ["/desk/a-valider", "À valider"],
      /* « Résultats » se confondait avec Adjudications, sous Marché, qui porte
         les résultats publiés par les Trésors. Celle-ci ne lit rien du marché :
         elle porte l'allocation sur NOS ordres, puis leur règlement. Deux
         choses distinctes qui s'appelaient pareil ; c'est le nom qui trompait,
         pas la page. */
      ["/desk/resultats", "Allocations et règlement"],
      ["/desk/encaissements", "Encaissements"],
      /* Le contrôle que la règle des espèces, ouverte le 2 octobre 2026, rend
         obligatoire : ce que la maison doit à ses clients face à ce qu'elle
         tient. Il se range après les encaissements parce qu'il les totalise. */
      ["/desk/rapprochement", "Rapprochement"],
      ["/desk/documents", "Documents"],
    ],
  },
  {
    label: "Clients",
    tabs: [
      ["/desk/clients", "Dossiers"],
      ["/desk/repertoire", "Répertoire"],
      ["/desk/messages", "Messages"],
    ],
  },
  {
    label: "Marché",
    tabs: [
      ["/desk/marche", "Cotes & VL"],
      // Le depot des bulletins : huit cents seances et le document de chacune.
      // Meme raison que « Seances » plus bas : relire une seance et retrouver
      // celle d il y a deux ans ne sont pas le meme travail, et la seconde ne
      // se cache pas derriere un lien au bas de la premiere.
      ["/desk/bulletins", "Bulletins"],
      // La mémoire du marché primaire : ce que les six Trésors ont payé, séance
      // par séance. Le taux indicatif d'un bon s'y fonde.
      ["/desk/adjudications", "Adjudications"],
      // La table est l'autre moitié du sujet : relire une séance et voir les huit
      // cents autres ne sont pas le même travail, et l'une ne se cache pas
      // derrière un lien au bas de l'autre.
      ["/desk/adjudications/tableau", "Séances"],
      // Ce qu'on tire du travail de relecture : la courbe et les mesures qui la
      // rendent lisible, dans une seule page. Elles ne se rangent pas avec les
      // cotes : leur matière est le marché primaire, relu séance par séance.
      ["/desk/analyses", "Analyses"],
      // La lecture, à côté de la saisie : les mêmes listes que le Guichet,
      // rendues par les mêmes composants, sans quitter le domaine du desk.
      ["/desk/titres", "Titres"],
      ["/desk/fonds", "Fonds"],
      ["/desk/indice/apercu", "Indice"],
      ["/desk/indice", "Notes"],
      ["/desk/societes", "Sociétés"],
      ["/desk/actualites", "Actualités"],
      ["/desk/robot", "Robot"],
    ],
  },
  {
    label: "Pilotage",
    tabs: [
      ["/desk/approbations", "Approbations"],
      ["/desk/referentiel", "Référentiel"],
      ["/desk/referentiel/modeles", "Modèles"],
      ["/desk/journal", "Journal"],
      ["/desk/equipe", "Équipe"],
      ["/desk/garde", "Droits de garde"],
      ["/desk/reporting", "Reporting"],
      ["/desk/sante", "Santé"],
      ["/desk/depot", "Dépôt"],
      ["/desk/docs", "Documentation"],
    ],
  },
];
export const DESK_TABS: [string, string][] = DESK_GROUPS.flatMap((g) => g.tabs);

export async function DeskNav({ current, badges = {}, rail = false }: { current: string; badges?: Record<string, number>; /** debout dans un rail de gauche, au lieu de couchée au-dessus de la page */ rail?: boolean }) {
  const t = await getT();
  return (
    <nav className={rail ? `${styles.nav} ${styles.navRail}` : styles.nav} aria-label="Desk" data-coach="nav">
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
    </nav>
  );
}
