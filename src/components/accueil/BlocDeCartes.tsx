import { TitreDeBloc } from "@/components/TitreDeBloc";
import { OfferCard, type CourbeDuTitre } from "@/components/OfferCard";
import { FundCard } from "@/app/fonds/FundCard";
import type { FundRow } from "@/app/fonds/FundsBrowser";
import type { Offer } from "@/lib/domain/types";
import { summarize } from "@/lib/domain/summary";
import styles from "./BlocDeCartes.module.css";

/**
 * UN BLOC DE L'ACCUEIL : LES CARTES DES LISTES, SANS L'EXTENSION (10 novembre 2026, planche « Accueil et page Trade », 1A).
 *
 * L'Accueil écrivait ses propres rangées pendant que Titres, Fonds et Adjudications montraient des cartes : le même titre se lisait de deux façons. Il rend maintenant LA carte compacte des listes — la même pièce, pas une copie —, sans le chevron ni l'extension : toucher la carte mène à la fiche, le « ··· » et le glissement restent.
 * Le titre est à plat au-dessus des cartes (« Tout voir » mène à la liste), comme celui des autres blocs d'une page d'arrivée ; trois cartes au plus, l'écart entre deux cartes est celui des tuiles.
 */
export type CarteDeBloc = { type: "offre"; o: Offer; courbe?: CourbeDuTitre } | { type: "fonds"; r: FundRow };

export async function BlocDeCartes({ id, titre, href, cartes, suivis, now = new Date() }: { id: string; titre: string; href: string; cartes: CarteDeBloc[]; suivis: Set<string>; now?: Date }) {
  if (!cartes.length) return null;
  return (
    <section className={styles.bloc} aria-labelledby={id}>
      <TitreDeBloc id={id} titre={titre} href={href} bandeau={false} />
      <div className={styles.cartes}>
        {cartes.map((c) =>
          c.type === "fonds" ? (
            <FundCard key={c.r.id} r={c.r} sansExtension />
          ) : (
            <OfferCard key={c.o.id} o={c.o} s={summarize(c.o, now)} suivi={suivis.has(c.o.id)} courbe={c.courbe} sansExtension />
          ),
        )}
      </div>
    </section>
  );
}
