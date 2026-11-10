import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";
/* La mesure du dossier, partagée avec les autres pages en liste. */
import commun from "../page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import { PLUS_PAGES } from "@/lib/plus/pages";
import { ICONES_DE_PLUS } from "@/lib/plus/icones";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mon activité" };

/**
 * « MON ACTIVITÉ » : LES RUBRIQUES QUE « PLUS » OUVRAIT À L'ACCUEIL (10 novembre 2026).
 *
 * Le menu à trois barres ouvre cette page. Elle ne porte que les rubriques, de « Mes ordres et intentions » à « Mes documents » : le journal du compte, ses compteurs et ses panneaux n'y sont plus (décidé le 10 novembre 2026). « Tous les
 * services » n'y est pas non plus : il a sa porte ailleurs.
 */
export default async function ActivitePage() {
  const t = await getT();
  await requireSession("/moi/activite");
  return (
    <Glissement>
      {/* UNE PILE : l'espace entre l'en-tête et les rubriques vient du jeton des sections (ETALON.md § 8). */}
      <main className={`pile ${commun.wrap}`}>
        <EnTete surTitre={t("Mon dossier")} titre={t("Mon activité")} phrase={t("Ce que vous suivez et gérez chaque semaine ou chaque mois : ordres, sondages, coupons, rentabilité, provision, versements, prélèvements et documents.")} />
        <nav className={styles.rubriques} aria-label={t("Mes rubriques")}>
          {PLUS_PAGES.filter((p) => p.cle !== "services").map((p) => (
            <Link key={p.cle} href={p.href} className={styles.rubrique}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={ICONES_DE_PLUS[p.cle]} />
              </svg>
              <span>{t(p.mot)}</span>
              <i aria-hidden="true">›</i>
            </Link>
          ))}
        </nav>
      </main>
    </Glissement>
  );
}
