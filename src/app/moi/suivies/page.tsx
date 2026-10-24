import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { LineIdentity } from "@/components/LineIdentity";
import { WatchButton } from "@/components/WatchButton";
import { summarize } from "@/lib/domain/summary";
import { lignesSuivies } from "@/lib/domain/suivies";
import { getT } from "@/i18n/server";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Lignes suivies") };
}

/**
 * CE QUE VOUS SURVEILLEZ SANS LE DÉTENIR.
 *
 * C'est la seule liste du client qui ne parle pas de son argent : une ligne
 * suivie n'est pas une position, c'est une ligne dont on veut apprendre le
 * changement. Sur la page d'accueil, elle se lisait trois lignes après « Vos
 * lignes », et les deux se confondaient — ce qu'on a, ce qu'on regarde.
 *
 * CHAQUE LIGNE MÈNE À SA FICHE, et nulle part ailleurs : le détail existe
 * déjà, à « /offres/{id} », avec le cours, l'échéancier et le geste. Le
 * recopier ici ferait une deuxième vérité sur le même titre.
 *
 * LE BOUTON « SUIVRE » RESTE SUR LA LIGNE : c'est le seul endroit où l'on
 * cesse de suivre sans d'abord ouvrir la fiche de ce qu'on ne veut plus voir.
 */
export default async function SuiviesPage() {
  const t = await getT();
  const s = await requireSession("/moi/suivies");
  const r = repo();
  const [watches, offers] = await Promise.all([r.listWatches(s.userId).catch(() => []), r.listOffers()]);
  /* Le tri vit dans le domaine : la page d'accueil compte les mêmes lignes
     pour l'étiquette de sa rubrique, et deux comptes du même objet finissent
     toujours par ne plus tomber sur le même nombre. */
  const suivies = lignesSuivies(watches, offers);
  const now = new Date();

  return (
    <Glissement>
      <main className="wrap">
        <EnTete
          retour={{ href: "/", mot: t("Tableau de bord") }}
          surTitre={t("Votre dossier")}
          titre={t("Lignes suivies")}
          phrase={t("Ce que vous surveillez sans le détenir. Un message vous prévient à chaque changement de cours, de prix ou de statut.")}
        />

        <div className="panel">
          {suivies.length === 0 ? (
            <div className="empty">
              {t("Vous ne suivez aucune ligne pour l'instant.")} <Link href="/titres">{t("Parcourir les titres")}</Link>
            </div>
          ) : (
            <div className={styles.watchList}>
              {suivies.map((o) => {
                const sm = summarize(o, now);
                return (
                  <div key={o.id} className={styles.watchRow}>
                    <LineIdentity o={o} s={sm} href={`/offres/${o.id}`} />
                    <div className={styles.watchHero}>
                      <b className={sm.gold ? styles.gold : undefined}>{sm.hero}</b>
                      <small>{t(sm.heroUnit ?? sm.heroSub)}</small>
                    </div>
                    <span className={`pill ${sm.statusClass}`}>{t(sm.status)}</span>
                    <WatchButton offerId={o.id} initial signedIn />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </Glissement>
  );
}
