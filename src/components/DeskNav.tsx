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
      ["/desk/resultats", "Résultats"],
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
      // La mémoire du marché primaire : ce que les six Trésors ont payé, séance
      // par séance. Le taux indicatif d'un bon s'y fonde.
      ["/desk/adjudications", "Adjudications"],
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
      ["/desk/reporting", "Reporting"],
      ["/desk/sante", "Santé"],
      ["/desk/depot", "Dépôt"],
      ["/desk/docs", "Documentation"],
    ],
  },
];
export const DESK_TABS: [string, string][] = DESK_GROUPS.flatMap((g) => g.tabs);

export async function DeskNav({ current, badges = {} }: { current: string; badges?: Record<string, number> }) {
  const t = await getT();
  return (
    <nav className={styles.nav} aria-label="Desk" data-coach="nav">
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
