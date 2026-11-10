import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Mon argent") };
}

/**
 * « MON ARGENT » : CE QUE L'ON PEUT FAIRE, PAR VERBE (10 novembre 2026, planche « Les mouvements d'argent », 2A).
 *
 * Sept pages se partageaient les mouvements d'argent sous des noms qui ne se répondaient pas. Elles se rangent ici sous quatre verbes — verser, retirer, placer, réinvestir — et chaque tuile mène droit à la page qui fait le geste, sans étape intermédiaire.
 * Le prélèvement n'est pas une destination mais un moyen : il paie la provision (« chaque mois, sur ma provision »). Ce qui est DÉJÀ en place se lit sur la page sœur « Ce qui part tout seul » (2B), dont le lien ferme celle-ci.
 */
export default async function ArgentPage() {
  const t = await getT();
  await requireSession("/moi/argent");
  const groupes: { titre: string; tuiles: { href: string; nom: string; dit: string }[] }[] = [
    {
      titre: t("Verser"),
      tuiles: [
        { href: "/moi/provision/alimenter/virement", nom: t("Une fois, par virement"), dit: t("C'est vous qui l'envoyez, depuis votre banque, quand vous voulez.") },
        { href: "/moi/prelevements?de=argent", nom: t("Chaque mois, sur ma provision"), dit: t("C'est nous qui le prenons, sur une autorisation que vous signez.") },
        { href: "/moi/epargne", nom: t("Chaque mois, dans un fonds"), dit: t("Une épargne programmée : une somme fixe, un jour du mois, un fonds choisi.") },
      ],
    },
    { titre: t("Retirer"), tuiles: [{ href: "/moi/provision/reprendre", nom: t("Vers ma banque"), dit: t("Le disponible est viré sur le compte déclaré à l'ouverture.") }] },
    {
      titre: t("Placer"),
      tuiles: [
        { href: "/moi/provision/placer", nom: t("Ma provision dans un fonds"), dit: t("Ce qui est disponible travaille, sans attendre un prochain ordre.") },
        { href: "/moi/reinvestir", nom: t("Mes coupons, automatiquement"), dit: t("Chaque coupon reçu est replacé sur la ligne de votre choix.") },
      ],
    },
  ];
  return (
    <Glissement>
      <div className={`pile ${styles.page}`}>
        <EnTete surTitre={t("Mon argent chez nous")} titre={t("Mon argent")} phrase={t("Verser, retirer, placer : ce que vous pouvez faire, et par où chaque geste commence.")} />
        {groupes.map((g) => (
          <section key={g.titre} className={styles.groupe} aria-label={g.titre}>
            <h2 className={styles.titre}>{g.titre}</h2>
            <div className={styles.tuiles}>
              {g.tuiles.map((x) => (
                <Link key={x.href} href={x.href} className={styles.tuile}>
                  <span>
                    <b>{x.nom}</b>
                    <small>{x.dit}</small>
                  </span>
                  <i aria-hidden="true">›</i>
                </Link>
              ))}
            </div>
          </section>
        ))}
        <Link href="/moi/regles" className={styles.pied}>
          {t("Ce qui part tout seul")} →
        </Link>
      </div>
    </Glissement>
  );
}
