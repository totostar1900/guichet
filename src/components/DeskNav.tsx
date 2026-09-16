import Link from "next/link";
import styles from "@/app/desk/page.module.css";

/** One desk sub-navigation for every desk page; badges count what waits on a tab. */
export const DESK_TABS: [string, string][] = [
  ["/desk", "Carnet du jour"],
  ["/desk/a-valider", "À valider"],
  ["/desk/clients", "Clients"],
  ["/desk/documents", "Documents"],
  ["/desk/resultats", "Résultats & positions"],
  ["/desk/marche", "Marché"],
  ["/desk/robot", "Robot"],
  ["/desk/reporting", "Reporting"],
  ["/desk/referentiel", "Référentiel"],
  ["/desk/sante", "Santé"],
];

export function DeskNav({ current, badges = {} }: { current: string; badges?: Record<string, number> }) {
  return (
    <nav className={styles.sub} aria-label="Desk">
      {DESK_TABS.map(([href, label]) => (
        <Link key={href} href={href} aria-current={href === current ? "page" : undefined}>
          {label}
          {badges[href] ? <span className={styles.navBadge}>{badges[href]}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
