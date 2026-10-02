import { fmt } from "@/lib/format";
import { getT } from "@/i18n/server";
import { NOM_FAMILLE, type PartFamille } from "@/lib/domain/familles-actifs";
import { COULEUR_FAMILLE } from "@/lib/domain/palette-graphiques";
import styles from "./page.module.css";

/**
 * La répartition par famille, en une barre.
 *
 * POURQUOI UNE BARRE ET PAS UN CAMEMBERT. Comparer des angles est plus dur que
 * comparer des longueurs, et un camembert à cinq parts demande une légende pour
 * être lu. Une barre unique se lit d'un trait, et les parts se nomment dessous,
 * à leur place.
 *
 * L'IDENTITÉ NE TIENT JAMAIS À LA COULEUR SEULE : chaque part porte son nom et
 * son pourcentage sous la barre, au même endroit que sa couleur. Qui ne
 * distingue pas deux teintes lit quand même la répartition.
 *
 * DEUX PIXELS DE FOND entre deux parts, pour qu'elles se séparent sans qu'on
 * ajoute un trait qui serait pris pour une donnée.
 *
 * LES COULEURS VIENNENT DE LA FAMILLE, JAMAIS DU RANG. Un portefeuille sans
 * actions ne repeint pas les fonds : la couleur désigne une chose, pas une
 * place dans une liste.
 */
export async function Repartition({ parts }: { parts: PartFamille[] }) {
  const t = await getT();
  const total = parts.reduce((s, p) => s + p.valeur, 0);
  if (total <= 0) return null;

  const L = 640;
  const ECART = 2;
  /* Les largeurs d'abord, les départs ensuite, sans rien muter en chemin : la
     maison interdit d'accumuler dans une variable au fil d'un map, et elle a
     raison, c'est le genre de boucle qu'on relit trois fois. Cinq parts : le
     coût du cumul répété ne se mesure pas. */
  const largeurs = parts.map((p, i) => Math.max(0, (p.valeur / total) * L - (i < parts.length - 1 ? ECART : 0)));
  const barres = parts.map((p, i) => ({ p, w: largeurs[i], x: largeurs.slice(0, i).reduce((s, w) => s + w + ECART, 0) }));

  return (
    <>
      <svg viewBox={`0 0 ${L} 30`} className={styles.graphe} role="img" aria-label={parts.map((p) => `${t(NOM_FAMILLE[p.famille])} ${p.part} %`).join(", ")}>
        {barres.map(({ p, x: bx, w }, i) => (
          <rect key={p.famille} x={bx} y="2" width={w} height="26" rx={i === 0 || i === barres.length - 1 ? 4 : 0} fill={COULEUR_FAMILLE[p.famille]}>
            <title>{`${t(NOM_FAMILLE[p.famille])} · ${fmt(Math.round(p.valeur))} FCFA · ${p.part} %`}</title>
          </rect>
        ))}
      </svg>
      <ul className={styles.legende}>
        {parts.map((p) => (
          <li key={p.famille}>
            <i style={{ background: COULEUR_FAMILLE[p.famille] }} aria-hidden="true" />
            <b>{p.part} %</b>
            <span>{t(NOM_FAMILLE[p.famille])}</span>
            <small>{fmt(Math.round(p.valeur))} FCFA</small>
          </li>
        ))}
      </ul>
    </>
  );
}
