import type { Intent, Offer } from "./types";

/**
 * Le sondage d'une adjudication : combien, et à quelle condition.
 *
 * Un appétit disait un montant et s'arrêtait là. Porté à l'émetteur, il ne
 * répondait donc pas à sa seule question : à quel prix cette demande tient-elle
 * encore ? Cinq cents millions « intéressés » ne valent rien si la moitié se
 * retire dès que le taux descend d'un quart de point, et la maison n'avait aucun
 * moyen de le dire autrement qu'au doigt mouillé.
 *
 * Le client pose donc sa condition avec son montant, et elle se lit dans le sens
 * de la ligne. Sur un OTA, il annonce le prix le plus haut qu'il accepte de
 * payer : plus il monte, mieux l'émetteur est servi. Sur un BTA, il annonce le
 * taux le plus bas qu'il accepte de recevoir : plus il descend, mieux l'émetteur
 * est servi. Les deux vivent dans le même champ, et c'est le compartiment de la
 * ligne qui dit dans quel sens le lire, jamais le champ lui-même.
 *
 * L'échelle qui en sort est cumulée, parce que c'est la forme qui décide : « à
 * 6,25 % ou mieux, deux cent cinquante millions, dont cent quatre-vingts
 * fermes » est une phrase qu'on porte à un émetteur. La liste des demandes une
 * par une ne l'est pas.
 */

/** Ce que la condition du client mesure sur cette ligne. */
export type SurveyUnit = "prix" | "taux";

export function surveyUnit(o: Offer): SurveyUnit {
  return o.kind === "BTA" ? "taux" : "prix";
}

/**
 * Les états où une demande compte encore.
 *
 * Après l'adjudication, servie ou non, elle raconte le passé : le sondage sert à
 * préparer, pas à constater. Une demande annulée ne compte pas, et une
 * contre-proposition non acceptée n'est pas une demande du client.
 */
const COUNTED = ["recue", "confirmee", "transmise"] as const;

export interface SurveyRow {
  /** La condition posée, ou rien : « sans condition » prend ce qui sortira. */
  limit: number | null;
  /** Les francs fermes disponibles à cette condition ou mieux. */
  firm: number;
  /** Les francs d'appétit, qui restent à confirmer. */
  soft: number;
  /** Le nombre de demandes comptées à ce niveau. */
  orders: number;
}

export interface SurveyLadder {
  /** Du mieux au moins bien pour l'émetteur, cumulé. */
  rows: SurveyRow[];
  firm: number;
  soft: number;
  orders: number;
  /** Ce qui ne pose aucune condition : disponible quel que soit le résultat. */
  unconditional: number;
  unit: SurveyUnit;
}

/**
 * L'échelle de la demande d'une ligne du primaire.
 *
 * Chaque palier porte tout ce qui tient à cette condition ou à une meilleure,
 * les demandes sans condition comprises, puisqu'elles tiennent à n'importe
 * laquelle. Un niveau ne paraît que si quelqu'un l'a posé : inventer des
 * paliers ronds entre les deux donnerait à lire une demande que personne n'a
 * exprimée.
 */
export function demandLadder(intents: Intent[], o: Offer): SurveyLadder {
  const unit = surveyUnit(o);
  const kept = intents.filter(
    (i) =>
      i.offerId === o.id &&
      (i.type === "appetit" || i.type === "ferme") &&
      (COUNTED as readonly string[]).includes(i.state) &&
      (i.amount ?? 0) > 0,
  );
  const firmOf = (i: Intent) => (i.type === "ferme" ? (i.amount ?? 0) : 0);
  const softOf = (i: Intent) => (i.type === "appetit" ? (i.amount ?? 0) : 0);
  const limitOf = (i: Intent) => (i.limitPrice != null && i.limitPrice > 0 ? i.limitPrice : null);

  const unconditional = kept.filter((i) => limitOf(i) == null).reduce((t, i) => t + (i.amount ?? 0), 0);

  // « Au moins aussi bon » n'a pas le même sens des deux côtés : un prix se
  // compare vers le haut, un taux vers le bas.
  const atLeast = (limit: number, level: number) => (unit === "prix" ? limit >= level : limit <= level);
  const levels = [...new Set(kept.map(limitOf).filter((v): v is number => v != null))].sort((a, b) => (unit === "prix" ? b - a : a - b));

  const rows: SurveyRow[] = levels.map((level) => {
    const held = kept.filter((i) => {
      const l = limitOf(i);
      return l == null || atLeast(l, level);
    });
    return {
      limit: level,
      firm: held.reduce((t, i) => t + firmOf(i), 0),
      soft: held.reduce((t, i) => t + softOf(i), 0),
      orders: held.length,
    };
  });

  // Les demandes sans condition forment leur propre palier, en tête : elles
  // tiennent quoi qu'il arrive, et c'est le plancher de ce que la maison promet.
  if (unconditional > 0) {
    const held = kept.filter((i) => limitOf(i) == null);
    rows.unshift({
      limit: null,
      firm: held.reduce((t, i) => t + firmOf(i), 0),
      soft: held.reduce((t, i) => t + softOf(i), 0),
      orders: held.length,
    });
  }

  return {
    rows,
    firm: kept.reduce((t, i) => t + firmOf(i), 0),
    soft: kept.reduce((t, i) => t + softOf(i), 0),
    orders: kept.length,
    unconditional,
    unit,
  };
}

/**
 * La condition du client tient-elle debout sur cette ligne ?
 *
 * Les bornes ne sont pas des convictions de marché, elles écartent la faute de
 * frappe : un prix de 9 au lieu de 90, un taux de 65 au lieu de 6,5. Ce qui
 * passe ici reste discutable, et c'est au desk d'en discuter.
 */
export function surveyLimitBlock(o: Offer, limit: number): string | null {
  if (!(limit > 0)) return "La condition se dit en nombre positif.";
  if (surveyUnit(o) === "taux") return limit > 30 ? "Un taux au-dessus de 30 % est probablement une faute de frappe." : null;
  return limit < 50 || limit > 150 ? "Un prix se dit en pourcentage du nominal, entre 50 et 150." : null;
}
