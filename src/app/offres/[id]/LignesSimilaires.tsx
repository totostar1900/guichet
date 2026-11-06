import Link from "next/link";
import { BlocDeLignes, lignesDeBloc } from "@/components/accueil/BlocDeLignes";
import { PastilleEtat } from "@/components/PastilleEtat";
import { PastilleVariation } from "@/components/PastilleVariation";
import { TitreDeBloc } from "@/components/TitreDeBloc";
import { getT } from "@/i18n/server";
import { repo } from "@/lib/data";
import { lieuDe } from "@/lib/domain/sections";
import { lignesSimilaires, listeDeLaFiche } from "@/lib/domain/accueil";
import type { Offer } from "@/lib/domain/types";
import styles from "./page.module.css";
import cartes from "./CartesSimilaires.module.css";

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
  /* LES LIGNES SIMILAIRES D'UNE ACTION SONT LES AUTRES ACTIONS COTÉES (9 novembre 2026, planche 2B : « les 6 autres ») : des cartes qui défilent, toutes de la même
     structure, donc alignées. Une action par ISIN : le jeu de démonstration en porte une en double. Les autres lignes gardent trois lignes à plat. */
  const action = o.kind === "MARCHE" && o.instrument === "action";
  const fonds = o.kind === "FONDS" && Boolean(o.fund);
  /* LES LIGNES SIMILAIRES D'UN FONDS SONT LES AUTRES FONDS (10 novembre 2026, planche 1A) : mêmes cartes qui défilent, sept au plus, ceux de la même société d'abord. */
  /* LES LIGNES SIMILAIRES D'UNE SÉANCE DU TRÉSOR AUSSI (6 novembre 2026, planche « A ») : les lignes de la même famille, en cartes qui défilent, sept au plus. */
  const seance = o.kind === "OTA" || o.kind === "APE" || o.kind === "BTA" || o.kind === "RACHAT";
  const enCartes = action || fonds || seance;
  const autres = action ? [...new Map(offres.filter((x) => x.kind === "MARCHE" && x.instrument === "action" && x.isin !== o.isin).map((x) => [x.isin, x] as const)).values()] : fonds ? offres.filter((x) => x.kind === "FONDS" && x.fund && x.id !== o.id) : seance ? offres : [];
  const similaires = enCartes ? lignesSimilaires(o, autres, now, 7) : lignesSimilaires(o, offres, now);
  if (!similaires.length) return null;
  const liste = listeDeLaFiche(o);
  const lignes = await lignesDeBloc(similaires, lieuDe(o) === "fonds" ? "fonds" : lieuDe(o) === "adjudications" ? "adjudications" : "cote", now);
  const dumeme = offres.filter((x) => x.id !== o.id && x.issuer === o.issuer && !x.hidden).length;
  return (
    <div className={styles.similaires} data-pane="essentiel">
      {enCartes ? (
        <section className={cartes.bloc} aria-labelledby="lignes-similaires">
          <TitreDeBloc id="lignes-similaires" titre="Lignes similaires" href={liste.href} tout={t("Voir toutes les lignes")} fort />
          <ul className={cartes.rail}>
            {lignes.map((l) => (
              <li key={l.id}>
                <Link href={l.href} className={cartes.carte}>
                  <b className={cartes.nom}>{l.nom}</b>
                  <span className={cartes.chiffre}>
                    {l.cours ? l.cours.texte : l.valeur}
                    {l.cours?.unite && <i>{l.cours.unite}</i>}
                  </span>
                  {/* LE LIBELLÉ DU CHIFFRE d'une séance (« si servi à 94 % ») : sans lui, 11,26 % ne dit pas de quoi il est le rendement. Les cartes d'une action ou d'un fonds n'en portent pas. */}
                  {seance && l.libelle && <span className={cartes.libelle}>{l.libelle}</span>}
                  <span className={cartes.perf}>
                    {l.variation && <PastilleVariation v={l.variation.v} titre={l.variation.titre} periode={l.variation.periode} />}
                    {l.etat && <PastilleEtat ton={l.etat.ton}>{l.etat.texte}</PastilleEtat>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
      <BlocDeLignes id="lignes-similaires" titre="Lignes similaires" href={liste.href} tout={t("Voir toutes les lignes")} lignes={lignes} plat fort />
      )}
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
