import Link from "next/link";
import { BlocDeLignes, lignesDeBloc } from "@/components/accueil/BlocDeLignes";
import { getT } from "@/i18n/server";
import { repo } from "@/lib/data";
import { lieuDe } from "@/lib/domain/sections";
import { lignesSimilaires, listeDeLaFiche } from "@/lib/domain/accueil";
import type { Offer } from "@/lib/domain/types";
import styles from "./page.module.css";

/**
 * LES SORTIES D'UNE FICHE : LIGNES SIMILAIRES, LISTE COMPLÈTE, TOUTES LES LIGNES DE L'ÉMETTEUR (2 novembre 2026).
 *
 * Une fiche ne doit pas être un cul-de-sac. En pied, trois lignes de la même famille
 * (de préférence du même émetteur) menant chacune à sa fiche ; le titre du bloc et « Voir
 * toutes… » mènent à la liste de la famille ; et, quand l'émetteur en porte d'autres, un
 * lien vers toutes ses lignes. Rien ici ne recommande : même famille, même émetteur, et
 * c'est tout (voir `lignesSimilaires`).
 */
export async function LignesSimilaires({ o }: { o: Offer }) {
  const t = await getT();
  const now = new Date();
  const offres = await repo().listOffers().catch(() => []);
  const similaires = lignesSimilaires(o, offres, now);
  if (!similaires.length) return null;
  const liste = listeDeLaFiche(o);
  const lignes = await lignesDeBloc(similaires, lieuDe(o) === "fonds" ? "fonds" : lieuDe(o) === "adjudications" ? "adjudications" : "cote", now);
  const dumeme = offres.filter((x) => x.id !== o.id && x.issuer === o.issuer && !x.hidden).length;
  return (
    <div className={styles.similaires} data-pane="essentiel">
      <BlocDeLignes id="lignes-similaires" titre="Lignes similaires" href={liste.href} tout={t("Voir toutes les lignes")} lignes={lignes} plat fort />
      {dumeme > 0 && (
        /* LE LIEN MÈNE À LA LISTE DE LA FAMILLE, FILTRÉE SUR CET ÉMETTEUR (8 novembre 2026) : il menait à la page de recherche générale, qui rend des pages et des
           définitions avant les lignes. La liste (adjudications, titres ou fonds) filtre déjà sur l'émetteur par « ?q= » (nom du registre compris). */
        <Link href={`${liste.href}?q=${encodeURIComponent(o.issuer)}`} className={styles.toutEmetteur}>
          {t("Toutes les lignes de {e}", { e: o.issuer })} →
        </Link>
      )}
    </div>
  );
}
