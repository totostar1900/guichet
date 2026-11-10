import Link from "next/link";
import { getT } from "@/i18n/server";
import { PLUS_PAGES } from "@/lib/plus/pages";
import { ICONES_DE_PLUS } from "@/lib/plus/icones";
import styles from "./Rubriques.module.css";

/**
 * LES RUBRIQUES DE L'ACTIVITÉ : CE QUE LE CLIENT SUIT, SON PROFIL, SON DOSSIER (10 novembre 2026, planche « Accueil et page Trade », 2A).
 *
 * Elles étaient réparties entre le menu « Plus » de l'Accueil, la page « Mon activité » et le menu à trois barres : une seule page les range maintenant, en deux groupes. L'activité reprend les entrées de « Plus » (la provision a son bloc au-dessus, les services leur rayon en dessous) ;
 * le dossier regroupe le profil d'investisseur, le compte, la sécurité et les documents.
 */
const DOSSIER = [
  { href: "/moi/profil", cle: "profil", mot: "Mon profil d'investisseur" },
  { href: "/moi/compte", cle: "compte", mot: "Mon compte" },
  { href: "/moi/securite", cle: "securite", mot: "Sécurité" },
  { href: "/moi/documents", cle: "documents", mot: "Mes documents" },
];

export async function Rubriques() {
  const t = await getT();
  const activite = PLUS_PAGES.filter((p) => !["services", "provision", "documents"].includes(p.cle));
  const groupes = [
    { titre: t("Mon activité"), lignes: activite.map((p) => ({ href: p.href, cle: p.cle, mot: p.mot })) },
    { titre: t("Mon dossier"), lignes: DOSSIER },
  ];
  return (
    <>
      {groupes.map((g) => (
        <section key={g.titre} className={styles.groupe} aria-label={g.titre}>
          <h2 className={styles.titre}>{g.titre}</h2>
          <nav className={styles.rubriques}>
            {g.lignes.map((l) => (
              <Link key={l.cle} href={l.href} className={styles.rubrique}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d={ICONES_DE_PLUS[l.cle]} />
                </svg>
                <span>{t(l.mot)}</span>
                <i aria-hidden="true">›</i>
              </Link>
            ))}
          </nav>
        </section>
      ))}
    </>
  );
}
