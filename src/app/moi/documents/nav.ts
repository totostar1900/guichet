/**
 * LES QUATRE RAYONS, NOMMÉS UNE FOIS.
 *
 * Le sommaire les liste, chaque page porte son nom et sa phrase en tête, et le
 * fil de retour y renvoie. Trois endroits : écrits trois fois ils auraient
 * divergé, et c'est toujours la phrase qui dérive en premier, parce qu'elle
 * est la seule des trois qu'on relit rarement.
 *
 * Le chemin tient en un mot sous « /moi/documents ». Une pièce vit à la même
 * profondeur, sous son identifiant ; un identifiant qui vaudrait « signes » ou
 * « argent » rendrait sa pièce inatteignable, et ces quatre mots-là sont
 * réservés par ce fichier.
 */
export const RAYONS_DES_PAPIERS = [
  {
    cle: "signes",
    href: "/moi/documents/signes",
    nom: "Ce que vous avez signé",
    quoi: "Vos engagements : ils ne changent que si vous les reprenez.",
  },
  {
    cle: "operations",
    href: "/moi/documents/operations",
    nom: "Ce que vos opérations ont produit",
    quoi: "Appels de fonds, résultats, avis d'opéré, coupons : ils tombent d'un ordre.",
  },
  {
    cle: "argent",
    href: "/moi/documents/argent",
    nom: "Les mouvements de votre argent",
    quoi: "Ce qui entre, ce qui sort, et ce que la conservation coûte.",
  },
  {
    cle: "demarches",
    href: "/moi/documents/demarches",
    nom: "Vos démarches",
    quoi: "Ce qu'on ouvre quand quelque chose ne va pas, ou quand on s'en va.",
  },
] as const;

export type CleDeRayon = (typeof RAYONS_DES_PAPIERS)[number]["cle"];
