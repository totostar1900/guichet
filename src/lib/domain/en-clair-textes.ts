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

/** Les chiffres de la ligne, un par un : un titre court, puis ce qu'il veut dire POUR CETTE LIGNE. Aucun frais : une seule ligne « Frais » les dit, ailleurs. */
export const CHIFFRES: Record<string, { titre: string; texte: string }> = {
  coupon: { titre: "Coupon : {coupon} %", texte: "Chaque année, l'émetteur verse {coupon} % du nominal : {montant} FCFA pour un titre de {nominal} FCFA. Le coupon se calcule toujours sur le nominal, jamais sur le prix payé." },
  prix_sous: { titre: "Prix : {prix} % du nominal", texte: "Le prix est sous le pair (moins de 100 %). Vous payez moins que le nominal et récupérez le nominal à l'échéance : le rendement dépasse le coupon." },
  prix_pair: { titre: "Prix : {prix} % du nominal", texte: "Le prix est au pair (100 %). Vous payez le nominal et le récupérez à l'échéance : le rendement est égal au coupon." },
  prix_dessus: { titre: "Prix : {prix} % du nominal", texte: "Le prix est au-dessus du pair (plus de 100 %). Vous payez une prime que vous ne reverrez pas : le rendement est inférieur au coupon." },
  echeance: { titre: "Échéance : {date}", texte: "La date où le nominal est remboursé, si l'émetteur honore son engagement. Avant cette date, revendre est possible mais peut prendre du temps." },
  nominal: { titre: "Nominal : {nominal} FCFA", texte: "La valeur de départ d'un titre. Le coupon et le remboursement se calculent dessus." },
  taux_precompte: { titre: "Taux précompté : {taux} %", texte: "L'intérêt est retiré du prix d'achat : pour un bon de {nominal} FCFA, vous payez moins et vous recevez {nominal} FCFA à l'échéance. Le rendement réel est un peu plus élevé que ce taux." },
  cours: { titre: "Cours : {cours} FCFA", texte: "Le dernier prix échangé en séance pour une action. Il monte et il descend, et il peut rester inchangé tant qu'aucun échange n'a lieu." },
  dividende: { titre: "Dividende : {dividende} FCFA", texte: "Ce que la société a versé par action au dernier exercice. Il dépend des résultats et du vote de l'assemblée : un dividende passé n'est pas une promesse." },
  rendement_dividende: { titre: "Rendement du dividende : {rendement} %", texte: "{dividende} FCFA de dividende rapportés au cours de {cours} FCFA, avant retenue à la source. Il change quand le cours change." },
  vl: { titre: "Valeur liquidative : {vl} FCFA", texte: "Le prix d'une part au {date}. Votre souscription est exécutée à la prochaine valeur calculée après votre ordre : vous connaissez votre montant, pas encore votre nombre de parts." },
  frequence: { titre: "Valeur calculée : {frequence}", texte: "La fréquence de calcul de la valeur liquidative fixe le délai avant l'exécution de votre ordre : plus elle est espacée, plus l'attente peut être longue." },
  categorie_M: { titre: "Catégorie : monétaire", texte: "Titres courts, valeur très régulière, argent disponible sous quelques jours. Le plus calme des quatre." },
  categorie_O: { titre: "Catégorie : obligataire", texte: "Obligations d'États et d'entreprises. Le rendement vient des coupons ; la valeur de la part est sensible aux taux." },
  categorie_D: { titre: "Catégorie : diversifiée", texte: "Un panachage d'obligations, d'actions et de trésorerie, arbitré par la société de gestion." },
  categorie_A: { titre: "Catégorie : actions", texte: "Exposée aux actions cotées : plus de potentiel, et plus de variations." },
};

export const TITRES_DES_CURSEURS = { gagner: "Ce que je peux gagner", recuperer: "Quand je récupère mon argent", risquer: "Ce qui peut mal tourner", enClair: "En clair", prix: "Comment le prix a bougé", risques: "Les risques et limites", chiffres: "Les chiffres de cette ligne" } as const;
