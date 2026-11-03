"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/client";
import { estIci, ongletsDuSiege } from "@/lib/nav-onglets";
import styles from "./OngletsMarche.module.css";

/**
 * LES TROIS CARTES (4 novembre 2026, choix 1B+C de la planche) : icône, nom, et ce qu'on trouve derrière. Elles remplacent
 * trois mots gris de 12 px (38 px de cible) ET le grand titre de la page, qui répétait l'onglet actif.
 *
 * La rangée du siège Instruments. Elle ne tient pas sa liste : « nav-onglets »
 * la lui donne, et porte la décision et ce qu'elle corrige, dont la raison
 * pour laquelle le marché n'en a pas.
 *
 * Chaque onglet porte le nom court de sa page, quand elle en a un : « Le
 * marché » devient « Vue d'ensemble », parce qu'à côté de ses propres pages le
 * nom de la famille ne dirait rien de plus que la pastille allumée.
 */
const TRAIT = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
/** Une icône par page, au trait des tuiles d'instruments. */
const ICONES: Record<string, React.ReactNode> = {
  titres: <path d="M4 17l5-5 4 3 7-8M16 7h4v4" />,
  fonds: (
    <>
      <path d="M12 3v9h9a9 9 0 1 1-9-9Z" />
      <path d="M15 3.5A9 9 0 0 1 20.5 9H15V3.5Z" />
    </>
  ),
  calendrier: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
};

export function OngletsMarche() {
  const path = usePathname();
  const t = useT();
  const pages = ongletsDuSiege(path);
  /* Hors du siège Instruments, elle n'a rien à dire : le marché a ses
     pastilles et son rail. Se retirer ici plutôt que de compter sur les pages
     pour ne pas la poser, parce qu'une page de plus naîtrait en la posant. */
  if (pages.length === 0) return null;
  return (
    <nav className={styles.onglets} aria-label={t("Ce qui s'achète")}>
      {pages.map((p) => (
        <Link key={p.key} href={p.href} replace className={styles.onglet} aria-current={estIci(p, path) ? "page" : undefined}>
          <svg viewBox="0 0 24 24" aria-hidden="true" {...TRAIT}>
            {ICONES[p.key]}
          </svg>
          <b>{t(p.short ?? p.label)}</b>
          {p.tuile && <small>{t(p.tuile)}</small>}
        </Link>
      ))}
    </nav>
  );
}
