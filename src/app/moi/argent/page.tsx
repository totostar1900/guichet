import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { cashPosition } from "@/lib/domain/cash";
import { fmt } from "@/lib/format";
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
  const s = await requireSession("/moi/argent");
  /* LE DISPONIBLE SE DIT SUR LES TUILES QUI EN VIVENT (audit « Mon argent », 10 novembre 2026) : retirer et placer n'ont rien à faire d'un disponible nul, et la tuile le dit avant qu'on l'ouvre. */
  const r = repo();
  const [cash, intents, mandats] = await Promise.all([r.listCash(s.userId).catch(() => []), r.listIntents().catch(() => []), r.listMandats(s.userId).catch(() => [])]);
  /* LA TUILE DU PRÉLÈVEMENT DIT SI IL EST DÉJÀ EN PLACE (audit « Mon argent », 11 novembre 2026) : un mandat vivant pour la provision rend le formulaire inutile, et mieux vaut le dire avant l'ouverture. */
  const mandat = mandats.find((m) => m.objet === "provision" && m.state !== "revoque");
  const dispo = t("{m} FCFA disponibles", { m: fmt(Math.round(cashPosition(cash, intents.filter((i) => i.clientId === s.userId)).idle)) });
  const groupes: { titre: string; tuiles: { href: string; nom: string; dit: string }[] }[] = [
    {
      titre: t("Verser"),
      tuiles: [
        { href: "/moi/provision/alimenter/virement", nom: t("Par virement"), dit: t("Une fois : c'est vous qui l'envoyez, depuis votre banque, quand vous voulez.") },
        { href: "/moi/prelevements?de=argent", nom: t("Autoriser un prélèvement"), dit: mandat ? `${mandat.signedAt ? t("Déjà en place") : t("À signer")} : ${t("{m} FCFA le {j} de chaque mois", { m: fmt(mandat.amount), j: String(mandat.dayOfMonth ?? "") })}.` : t("Chaque mois, sur ma provision : c'est nous qui le prenons, sur une autorisation que vous signez.") },
        { href: "/moi/epargne", nom: t("Épargne programmée"), dit: t("Chaque mois, dans un fonds : une somme fixe, un jour du mois, un fonds choisi.") },
      ],
    },
    { titre: t("Retirer"), tuiles: [{ href: "/moi/provision/reprendre", nom: t("Retirer de l'argent"), dit: `${t("Vers ma banque, sur le compte déclaré à l'ouverture.")} ${dispo}` }] },
    {
      titre: t("Placer"),
      tuiles: [
        { href: "/moi/provision/placer", nom: t("Placer ma provision"), dit: `${t("Dans un fonds monétaire, sans attendre un prochain ordre.")} ${dispo}` },
        { href: "/moi/reinvestir", nom: t("Réinvestir mes coupons"), dit: t("Chaque coupon reçu est replacé automatiquement sur la ligne de votre choix.") },
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
