import { resolveIssuer } from "@/data/issuer-registry";
import { daysBetween } from "@/lib/finance";
import { fmt, fmtDate, fmtPct, fmtPrice, localIso } from "@/lib/format";
import type { Offer } from "./types";

/**
 * CE QUE PORTE UNE CARTE COMPACTE, SUR UN TÉLÉPHONE.
 *
 * LE DÉFAUT CORRIGÉ EST UNE TRONCATURE, mesurée le 4 octobre 2026. La deuxième
 * ligne portait une phrase de 89 caractères, « actuariel annuel brut au cours
 * 97 % du 26 mars 2026 · aucun échange relevé · coupon 6,60 % », dans une place
 * qui en laisse 33 : le lecteur voyait « actuariel annuel brut au cours 9… ».
 * Les qualificatifs passaient, les deux faits utiles tombaient dans les points
 * de suspension. La phrase était bien composée, dans le mauvais ordre pour un
 * écran étroit.
 *
 * UN SEUL CHIFFRE EN AVANT, LE RENDEMENT. Le coupon redescend dans la ligne
 * grise, précédé de son nom : ce n'est pas lui qui décide, c'est celui qu'on
 * compare au prix payé. La première ligne ne porte donc aucun nombre.
 *
 * L'ORIGINE SE DIT SOUS LE CHIFFRE, en deux champs : le prix retenu, et depuis
 * combien de jours il n'a pas bougé. Mesuré sur douze mois du compartiment
 * obligataire : zéro transaction sur 7 709 couples ligne-séance, et vingt et
 * une lignes sur trente-cinq au même cours depuis 397 jours. Sans l'âge,
 * « 11,09 % » se lit comme un rendement de marché.
 *
 * CE MODULE NE TRADUIT RIEN. Il rend une clef et ses trous, la page les met en
 * mots : un module de domaine qui écrirait ses propres phrases en français les
 * rendrait invisibles au scanner de clefs, qui ne voit qu un appel littéral.
 * C'est la règle que `market/yield.ts` suit déjà pour ses hypothèses.
 */
export interface Phrase {
  key: string;
  params?: Record<string, string>;
}

/**
 * Le code d'un État, en trois lettres.
 *
 * ISO 3166 partout, sauf la Centrafrique : « CAF » se lit confédération de
 * football en zone francophone, et « RCA » est ce que le Trésor écrit dans ses
 * propres communiqués. Un écart assumé, et le seul.
 */
export const CODE_PAYS: Record<Offer["country"], string> = { Cameroun: "CMR", Gabon: "GAB", Tchad: "TCD", Congo: "COG", RCA: "RCA", "Guinée éq.": "GNQ" };

/**
 * POUR TOUT AUTRE ÉMETTEUR, LE CODE EST UNE DONNÉE DU RÉFÉRENTIEL.
 *
 * « BHC » et « REG » sont des mnémoniques de bulletin : ils servent à
 * rapprocher une ligne d'un émetteur, pas à le nommer devant un client. La
 * fiche de chaque société et de chaque émetteur obligataire porte donc un
 * « Nom court » que le desk écrit, et la carte le suit à la publication :
 * « BGFI », « La Régionale », « SAFACAM ».
 *
 * À DÉFAUT, LE SLUG, qui est le mnémonique BVMAC : un code vaut toujours mieux
 * qu'un nom entier sur deux lignes, mais aucune règle ne devine un nom propre.
 * « La Régionale » coupé au premier mot donnerait « LA ». Un slug qui ne tient
 * pas en huit lettres sans trait d'union n'a donc pas de code par défaut, et
 * un cliquet le dit plutôt que de laisser l'écran inventer.
 */
export const codeLisible = (slug: string): boolean => /^[a-z0-9]{2,8}$/.test(slug);

/** Un code trop long chasse la ligne grise de sa colonne : quatorze signes au plus. */
export const CODE_MAX = 14;

/** « GAB », « BGFI », « SAFACAM » : ce que la première ligne de la carte annonce. */
export function codeCourt(o: Pick<Offer, "isin" | "issuer" | "title" | "country">): string {
  const p = resolveIssuer(o);
  if (!p) return CODE_PAYS[o.country] ?? o.country;
  if (p.code) return p.code;
  if (p.family === "etat") return CODE_PAYS[o.country] ?? o.country;
  return codeLisible(p.slug) ? p.slug.toUpperCase() : p.name;
}

/** « 30 déc. 2027 » devient « déc. 2027 » : le jour n'apprend rien à qui choisit une durée. */
const moisAn = (d: string): string => fmtDate(d).replace(/^[0-9]+\s/, "");

/**
 * La ligne grise : ce que l'émetteur promet, jamais ce que le marché en dit.
 * Une action n'a ni coupon ni échéance, elle a un dividende.
 */
export function ligneGrise(o: Offer): Phrase {
  if (o.kind === "RACHAT") return o.maturityOn ? { key: "Rachat au pair · éch. {d}", params: { d: moisAn(o.maturityOn) } } : { key: "Rachat au pair" };
  if (o.kind === "FONDS") return o.fund ? { key: "Fonds · VL du {d}", params: { d: fmtDate(o.fund.navDate, false) } } : { key: "Fonds" };
  if (o.kind === "ACTIONS" || (o.kind === "MARCHE" && o.instrument === "action")) return o.dividendPerShare ? { key: "Dividende {n} FCFA", params: { n: fmt(o.dividendPerShare) } } : { key: "Action · pas de dividende connu" };
  if (o.kind === "BTA") return o.maturityOn ? { key: "Bon précompté · {d}", params: { d: moisAn(o.maturityOn) } } : { key: "Bon précompté · échéance à préciser" };
  const c = fmtPct(o.couponRate ?? 0, 2);
  if (!o.maturityOn) return { key: "Coupon {c} · échéance à préciser", params: { c } };
  const d = moisAn(o.maturityOn);
  /* « par tranches » ne monte pas ici : la forme complete fait 44 caracteres
     la ou la colonne en tient 34 sur un telephone, et l amortissement se lit
     sur la fiche et au dos de la carte. Le coupon et l echeance decident. */
  return /BRUT/i.test(o.title) ? { key: "Coupon {c} brut · {d}", params: { c, d } } : { key: "Coupon {c} · {d}", params: { c, d } };
}

/**
 * D'où vient le chiffre de droite, en un champ court.
 *
 * Chaque forme dit sa nature sans adjectif : un taux imprimé par le Trésor, un
 * prix proposé, un cours de référence avec son âge, un pair qui n'a jamais
 * bougé. Un rendement dont l'origine ne se dit pas n'a pas sa place à côté
 * d'un bouton d'achat.
 */
export function origineDuChiffre(o: Offer, now: Date): Phrase {
  if (o.kind === "RACHAT") return { key: "du nominal, pas un rendement" };
  if (o.kind === "FONDS") return { key: "douze mois écoulés" };
  if (o.kind === "BTA") return o.precountRate == null ? { key: "taux à fixer" } : { key: o.servedPricePct != null ? "adjugé à {r} précompté" : "si adjugé à {r} précompté", params: { r: fmtPct(o.precountRate, 2) } };
  if (o.kind === "ACTIONS") return o.pricePerShare ? { key: "au prix de {n}", params: { n: fmt(o.pricePerShare) } } : { key: "prix à fixer" };
  if (o.kind === "OTA" || o.kind === "APE") {
    const p = o.servedPricePct ?? o.pricePct;
    return p == null ? { key: "prix à fixer" } : { key: o.servedPricePct != null ? "servi à {p}" : "si servi à {p}", params: { p: fmtPrice(p) } };
  }
  const prix = o.ask ?? o.lastPrice;
  if (prix == null) return { key: "sans cours" };
  if (o.instrument === "action") return { key: "cours {n} FCFA", params: { n: fmt(prix) } };
  const age = o.priceSince ? daysBetween(o.priceSince, localIso(now)) : 0;
  const p = fmtPrice(prix);
  return age > 0 ? { key: "{p} · {n} j", params: { p, n: fmt(age) } } : { key: "cours {p}", params: { p } };
}

/**
 * Toutes les clefs que ce module peut rendre.
 *
 * Elles traversent `t()` sous forme de variable, donc le scanner de clefs ne
 * les voit pas : cette liste existe pour qu'un cliquet les confronte au
 * dictionnaire, une par une, et elle est elle-même contrôlée contre les clefs
 * que le code produit vraiment.
 */
export const CLEFS_CARTE: string[] = [
  "Rachat au pair · éch. {d}",
  "Rachat au pair",
  "Fonds · VL du {d}",
  "Fonds",
  "Dividende {n} FCFA",
  "Action · pas de dividende connu",
  "Bon précompté · {d}",
  "Bon précompté · échéance à préciser",
  "Coupon {c} · échéance à préciser",
  "Coupon {c} brut · {d}",
  "Coupon {c} · {d}",
  "du nominal, pas un rendement",
  "douze mois écoulés",
  "taux à fixer",
  "adjugé à {r} précompté",
  "si adjugé à {r} précompté",
  "au prix de {n}",
  "prix à fixer",
  "servi à {p}",
  "si servi à {p}",
  "sans cours",
  "cours {n} FCFA",
  "cours {p}",
  "{p} · {n} j",
];
