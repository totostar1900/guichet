"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

/**
 * LE DOMICILE DE CE QUE LA COLONNE AFFICHE.
 *
 * La colonne vit dans la mise en page, donc AU-DESSUS des pages dans l'arbre.
 * Or ce qu'elle doit montrer est connu PLUS BAS : les pastilles sont calculées
 * par chaque page du desk, qui compte ce qui l'attend, et les sections sont
 * déclarées par la page qui les porte.
 *
 * D'où ce magasin, et un seul pour les deux. Un sujet a un domicile : deux
 * contextes pour « ce que la colonne montre » finiraient par se contredire,
 * et personne ne saurait lequel fait foi.
 *
 * CE QU'IL NE FAIT PAS. Il ne calcule rien et ne lit aucune base : il
 * transporte. Les pastilles sont exactement celles que `DeskNav` portait déjà,
 * et les sections exactement celles que les rails recevaient. Déplacer un
 * chiffre n'est pas le recalculer, et un transport qui recalcule est un
 * transport qui finit par mentir.
 */
export interface SectionColonne {
  id: string;
  titre: string;
  /** Les sections d'une page longue se rangent, comme au rail des analyses. */
  groupe?: string;
  /** Ce qui reste ouvert dans cette section, et se compte. */
  alerte?: number;
}

interface Magasin {
  badges: Record<string, number>;
  poserBadges: (cle: string, b: Record<string, number>) => void;
}

const Ctx = createContext<Magasin | null>(null);

export function ColonneStore({ children }: { children: React.ReactNode }) {
  /* Par clef d'émetteur, et non en vrac : une page qui s'en va doit pouvoir
     retirer SES chiffres sans emporter ceux d'une autre. */
  const [parEmetteur, setParEmetteur] = useState<Record<string, Record<string, number>>>({});

  const valeur = useMemo<Magasin>(
    () => ({
      badges: Object.assign({}, ...Object.values(parEmetteur)) as Record<string, number>,
      poserBadges: (cle, b) =>
        setParEmetteur((p) => {
          /* UNE ÉCRITURE QUI NE CHANGE RIEN NE DOIT PAS REDESSINER. Sans cette
             comparaison, chaque rendu de page reposerait le même objet et la
             colonne se redessinerait en boucle. */
          const avant = p[cle];
          if (avant && JSON.stringify(avant) === JSON.stringify(b)) return p;
          return { ...p, [cle]: b };
        }),
    }),
    [parEmetteur],
  );

  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;
}

/** Ce que la colonne doit montrer. Hors du magasin, rien : la colonne reste muette plutôt que fausse. */
export function useColonne(): Magasin {
  return useContext(Ctx) ?? { badges: {}, poserBadges: () => {} };
}

/**
 * Une page déclare ses pastilles à la colonne.
 *
 * Elle les RETIRE en partant. Un compte qui survit à la page qui l'a produit
 * est exactement la panne muette que la maison poursuit : la colonne dirait
 * « sept à valider » sur une page qui n'en sait plus rien.
 */
export function DeclarerBadges({ cle, badges }: { cle: string; badges: Record<string, number> }) {
  const { poserBadges } = useColonne();
  const fige = JSON.stringify(badges);
  useEffect(() => {
    poserBadges(cle, JSON.parse(fige) as Record<string, number>);
    return () => poserBadges(cle, {});
  }, [cle, fige, poserBadges]);
  return null;
}
