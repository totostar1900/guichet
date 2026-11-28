/**
 * LES MOTS DE « EN CLAIR » (28 novembre 2026). Écrits en toutes lettres dans des tables : le scanner de clefs de traduction ne voit que ce qui est littéral dans la source.
 *
 * LE TON (ETALON.md § 10) : un engagement se dit comme un engagement, un gain possible avec « peut » ; le risque est toujours dit, juste après. Aucun mot ne promet, aucun ne conseille.
 */
export type CleDeLaPhrase = "dette" | "dette_sans_coupon" | "dette_sans_echeance" | "bon" | "action" | "fonds";
export type Famille = "dette" | "bon" | "action" | "fonds";

/** La phrase d'ouverture : ce qu'on fait en achetant. */
export const PHRASE: Record<CleDeLaPhrase, string> = {
  dette: "Vous prêtez de l'argent. Émetteur : {emetteur}. Il s'engage à verser {coupon} % par an du nominal ({montant} FCFA pour {nominal} FCFA) jusqu'en {annee}, puis à rembourser le nominal.",
  dette_sans_coupon: "Vous prêtez de l'argent. Émetteur : {emetteur}. Il s'engage à rembourser le nominal ({nominal} FCFA par titre) à l'échéance.",
  dette_sans_echeance: "Vous prêtez de l'argent. Émetteur : {emetteur}. Il s'engage à verser {coupon} % par an du nominal ({montant} FCFA pour {nominal} FCFA), puis à rembourser le nominal.",
  bon: "Vous prêtez de l'argent à court terme. Émetteur : {emetteur}. Les intérêts sont retirés du prix d'achat ; il s'engage à rembourser le nominal à l'échéance.",
  action: "Vous achetez une part de {societe}. Son prix change à chaque séance, et la société peut verser un dividende selon ses résultats.",
  fonds: "Vous achetez des parts d'un fonds géré par {gestionnaire}. Le prix d'une part, la valeur liquidative, n'est connu qu'après votre ordre.",
};

/** Ce que je peux gagner. */
export const GAGNER: Record<Famille, string> = {
  dette: "Des intérêts réguliers (le coupon), puis le nominal à l'échéance, si l'émetteur honore son engagement.",
  bon: "Un intérêt, déjà compris dans le prix : vous payez moins que le nominal et recevez le nominal à l'échéance, si l'émetteur honore son engagement.",
  action: "Un dividende, si la société en verse, et une hausse du prix, si elle se produit. Ni l'un ni l'autre n'est garanti.",
  fonds: "Une hausse de la valeur de la part, si les actifs du fonds progressent. Rien n'est garanti.",
};

/** Quand je récupère mon argent. */
export const RECUPERER: Record<Famille, string> = {
  dette: "À l'échéance, ou en revendant avant : cela peut prendre plusieurs séances.",
  bon: "À l'échéance, au nominal. Revendre avant est possible, avec un délai.",
  action: "En revendant en séance. Peu d'actions s'échangent à chaque séance : prévoyez un délai.",
  fonds: "Au rachat, à la prochaine valeur liquidative calculée après votre ordre.",
};

/** Ce qui peut mal tourner : toujours dit, jamais seul (le geste qui réduit le risque est dans les « Risques et limites »). */
export const RISQUER: Record<Famille, string> = {
  dette: "L'émetteur peut ne pas payer. Si vous revendez avant l'échéance, le prix peut être inférieur à ce que vous espériez.",
  bon: "L'émetteur peut ne pas rembourser. Revendre avant l'échéance peut se faire à un prix inférieur.",
  action: "Le prix peut baisser et le capital n'est pas garanti. Le dividende dépend des résultats et du vote de l'assemblée.",
  fonds: "La valeur de la part peut baisser. Les performances passées ne préjugent pas des performances futures.",
};

export const TITRES_DES_CURSEURS = { gagner: "Ce que je peux gagner", recuperer: "Quand je récupère mon argent", risquer: "Ce qui peut mal tourner", enClair: "En clair", prix: "Comment le prix a bougé", risques: "Les risques et limites" } as const;
