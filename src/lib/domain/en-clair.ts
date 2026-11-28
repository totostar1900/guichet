/**
 * « EN CLAIR » : CE QU'UNE LIGNE VEUT DIRE POUR UN NOVICE (28 novembre 2026, le client : « les novices ne savent pas lire les tuiles, surtout les tuiles étendues et les fiches » ; puis : « la page en
 * clair sera une fenêtre, dynamique, adaptée à la ligne, qui ne change rien au contenu actuel »).
 *
 * UNE PHRASE, TROIS LIGNES (ce qu'on peut gagner, quand on récupère son argent, ce qui peut mal tourner) ET LES CHIFFRES DE CETTE LIGNE, expliqués avec leurs valeurs : le coupon en FCFA,
 * ce que dit le prix par rapport au pair, le dividende rapporté au cours, la fréquence de la valeur liquidative. Tout est calculé des seules données de la ligne, jamais d'un avis.
 *
 * LE TON (ETALON.md § 10) : un engagement de l'émetteur se dit comme un engagement (« s'engage à verser »), jamais comme un gain acquis ; un gain possible se dit avec « si » ou « peut ». Le
 * risque vient toujours AVEC le gain. Ce fichier ne lit rien et n'écrit aucun mot : il reçoit la ligne et rend des CLEFS et leurs paramètres ; les mots sont dans `en-clair-textes.ts`.
 * Aucun frais n'y est dit : le client lit une seule ligne « Frais », dans l'ordre.
 */
export type FamilleEnClair = "dette" | "bon" | "action" | "fonds";

/** Ce qu'il faut d'une ligne : une offre du Guichet, ou la ligne d'un fonds de la liste, y répondent toutes deux. */
export interface FaitsDeLigne {
  kind: string;
  instrument?: string;
  issuer: string;
  title: string;
  nominal: number;
  maturityOn?: string;
  couponRate?: number;
  precountRate?: number;
  pricePct?: number;
  servedPricePct?: number;
  pricePerShare?: number;
  lastPrice?: number;
  dividendPerShare?: number;
  fund?: { manager: string; category: string; frequency: string; nav: number; navDate: string };
}

export type CleDeChiffre =
  | "coupon" | "prix_sous" | "prix_pair" | "prix_dessus" | "echeance" | "nominal" | "taux_precompte"
  | "cours" | "dividende" | "rendement_dividende"
  | "vl" | "frequence" | "categorie_M" | "categorie_O" | "categorie_D" | "categorie_A";

export interface Chiffre {
  cle: CleDeChiffre;
  params: Record<string, string>;
}

export interface EnClair {
  famille: FamilleEnClair;
  /** Les paramètres de la phrase et des trois lignes. */
  params: Record<string, string>;
  /** Les chiffres de CETTE ligne, dans l'ordre où on les lit. */
  chiffres: Chiffre[];
}

const nombre = (n: number, dec = 0): string => n.toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/[  ]/g, " ");

/** La famille de lecture d'une ligne, ou rien quand le novice n'a rien à y comprendre de plus (un rachat, une opération sans titre). */
export function familleEnClair(o: Pick<FaitsDeLigne, "kind" | "instrument">): FamilleEnClair | undefined {
  if (o.kind === "FONDS") return "fonds";
  if (o.kind === "BTA") return "bon";
  /* Une introduction ou une augmentation de capital (« ACTIONS ») s'achète comme une action : une part de la société. */
  if (o.kind === "ACTIONS") return "action";
  if (o.kind === "MARCHE") return o.instrument === "action" ? "action" : "dette";
  if (o.kind === "OTA" || o.kind === "APE") return "dette";
  return undefined;
}

export function enClairDe(o: FaitsDeLigne): EnClair | undefined {
  const famille = familleEnClair(o);
  if (!famille) return undefined;
  const annee = o.maturityOn ? o.maturityOn.slice(0, 4) : "";
  const coupon = o.couponRate != null ? nombre(o.couponRate, 2).replace(/,00$/, "").replace(/(,\d)0$/, "$1") : "";
  const montant = o.couponRate != null ? nombre(Math.round((o.nominal * o.couponRate) / 100)) : "";
  const params: Record<string, string> = {
    emetteur: o.issuer || o.title,
    societe: o.issuer || o.title,
    gestionnaire: o.fund?.manager ?? o.issuer,
    annee,
    coupon,
    nominal: nombre(o.nominal),
    montant,
  };
  const chiffres: Chiffre[] = [];
  if (famille === "dette") {
    if (o.couponRate != null) chiffres.push({ cle: "coupon", params });
    const prix = o.servedPricePct ?? o.pricePct;
    if (prix != null && prix > 0) {
      const cle = prix < 99.995 ? "prix_sous" : prix > 100.005 ? "prix_dessus" : "prix_pair";
      chiffres.push({ cle, params: { ...params, prix: nombre(prix, 2).replace(/,00$/, "") } });
    }
    if (o.maturityOn) chiffres.push({ cle: "echeance", params: { ...params, date: o.maturityOn } });
    chiffres.push({ cle: "nominal", params });
  } else if (famille === "bon") {
    if (o.precountRate != null) chiffres.push({ cle: "taux_precompte", params: { ...params, taux: nombre(o.precountRate, 2).replace(/,00$/, "") } });
    if (o.maturityOn) chiffres.push({ cle: "echeance", params: { ...params, date: o.maturityOn } });
    chiffres.push({ cle: "nominal", params });
  } else if (famille === "action") {
    const cours = o.lastPrice ?? o.pricePerShare;
    if (cours) chiffres.push({ cle: "cours", params: { ...params, cours: nombre(cours) } });
    if (o.dividendPerShare) chiffres.push({ cle: "dividende", params: { ...params, dividende: nombre(o.dividendPerShare) } });
    if (cours && o.dividendPerShare) chiffres.push({ cle: "rendement_dividende", params: { ...params, cours: nombre(cours), dividende: nombre(o.dividendPerShare), rendement: nombre((o.dividendPerShare / cours) * 100, 1) } });
  } else if (o.fund) {
    chiffres.push({ cle: "vl", params: { ...params, vl: nombre(o.fund.nav), date: o.fund.navDate } });
    if (o.fund.frequency !== "?") chiffres.push({ cle: "frequence", params: { ...params, frequence: o.fund.frequency } });
    if (o.fund.category === "M" || o.fund.category === "O" || o.fund.category === "D" || o.fund.category === "A") chiffres.push({ cle: `categorie_${o.fund.category}`, params });
  }
  return { famille, params, chiffres };
}

/** La clef du texte d'une ligne : la phrase est plus précise quand l'échéance et le coupon sont connus. */
export const cleDeLaPhrase = (e: EnClair): "dette" | "dette_sans_coupon" | "dette_sans_echeance" | "bon" | "action" | "fonds" => {
  if (e.famille !== "dette") return e.famille;
  if (!e.params.coupon) return "dette_sans_coupon";
  return e.params.annee ? "dette" : "dette_sans_echeance";
};
