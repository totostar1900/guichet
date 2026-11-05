import Link from "next/link";
import { getT } from "@/i18n/server";
import { Carte } from "@/components/Carte";
import styles from "./page.module.css";

/**
 * LE PIED DE LA FICHE : LES RISQUES, EN TROIS LIENS (8 novembre 2026).
 *
 * Il n'y avait qu'une phrase, avec un seul lien vers la leçon. Un pied de page de référence range ses textes en une courte liste, chacun avec ce qu'il contient,
 * puis la mention en petit. Même chose ici, et les risques d'abord : le texte opposable (« Risques et limites »), la leçon qui l'explique, la documentation qui
 * décrit chaque instrument. Le ton est celui d'ETALON § 10 : le chemin vers le texte avant tout, aucune mention retirée.
 */
export async function PiedDeFiche({ carte = false }: { /** Les rangées dans un encadré en relief : la fiche d'une action (9 novembre 2026). */ carte?: boolean }) {
  const t = await getT();
  const liens: { href: string; titre: string; sous: string }[] = [
    { href: "/info/risques#risques", titre: t("Risques et limites"), sous: t("Le texte qui s'applique à toutes les lignes") },
    { href: "/info/les-quatre-risques", titre: t("Les quatre risques, et ce qu'on peut faire"), sous: t("La leçon du Guide") },
    { href: "/info/mentions#types-de-risques", titre: t("Services et risques associés"), sous: t("Chaque instrument, ses chiffres, vos ordres") },
  ];
  return (
    <footer className={styles.pied} aria-labelledby="pied-fiche" data-pane={carte ? "essentiel" : undefined}>
      <h2 id="pied-fiche">{t("Pour investir sereinement")}</h2>
      {(() => {
        const liste = (
          <ul className={styles.piedListe}>
            {liens.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={styles.piedLien}>
                  <span>
                    <b>{l.titre}</b>
                    <small>{l.sous}</small>
                  </span>
                  <i aria-hidden="true">→</i>
                </Link>
              </li>
            ))}
          </ul>
        );
        return carte ? <Carte plat>{liste}</Carte> : liste;
      })()}
      <p className={styles.piedMention}>{t("Communication à caractère promotionnel. Risque de perte en capital.")}</p>
    </footer>
  );
}
