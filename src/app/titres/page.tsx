import { TitresBody } from "../TitresBody";

export const dynamic = "force-dynamic";
export const metadata = { title: "Titres" };

/**
 * La liste des titres, à son adresse à elle.
 *
 * Elle était l'accueil, et c'était le problème : une plateforme rangée par
 * instrument sert l'acquisition, mais après son premier achat un client pense
 * par intention, et cet axe n'existait nulle part. La racine passe donc à
 * l'accueil, qui présente ou qui accueille selon qu'on est connecté ; la liste
 * garde tout son rôle, à « /titres ».
 */
export default async function TitresPage() {
  return <TitresBody />;
}
