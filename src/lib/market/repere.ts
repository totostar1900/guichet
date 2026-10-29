import type { AuctionResult } from "./auction-results";
import type { Offer } from "@/lib/domain/types";
import { niveauDuMarche } from "./niveau-marche";
import { surveyUnit } from "@/lib/domain/survey";
import { localIso } from "@/lib/format";

/**
 * CE QUE LA PLACE A SERVI LA DERNIÈRE FOIS, DANS L'UNITÉ OÙ LE CLIENT TAPE.
 *
 * Le client pose une enchère sur une adjudication sans savoir ce que la
 * séance d'avant a payé. Le formulaire lui donnait pour tout repère le niveau
 * ANNONCÉ, en gabarit de champ : c'est le vœu du Trésor, pas le prix du
 * marché. Entre les deux il y a parfois cent points de base, et c'est
 * exactement l'écart sur lequel une demande se sert ou ne se sert pas.
 *
 * LA MAISON SAVAIT DÉJÀ RÉPONDRE, mais pour le desk seul : « niveauDuMarche »
 * apparie par la vie restante et non par l'étiquette de durée, écarte les
 * abondements, ne sort pas du pays, et dit quand il ne tient qu'à une séance.
 * Ces quatre règles ont été mesurées avant d'être écrites ; les rejouer ici
 * les ferait diverger, donc on les emprunte.
 *
 * ON NE REPREND PAS SON CHIFFRE POUR AUTANT, ET C'EST TOUT LE SOIN DE CE
 * FICHIER. « niveauDuMarche » rend un RENDEMENT, parce que c'est la seule
 * grandeur qui se compare d'un compartiment à l'autre. Le client, lui, tape un
 * taux précompté sur un bon et un prix en pourcentage du nominal sur une
 * obligation. Poser un rendement sous un champ qui attend un prix serait la
 * faute d'unité que cette maison traque partout ailleurs — celle qui fait
 * écrire 0,97 pour 97. On ne garde donc du niveau que le CHOIX DE LA SÉANCE,
 * et on relit sur cette séance le chiffre dans l'unité du champ.
 *
 * ET ON SE TAIT PLUTÔT QUE D'APPROCHER. Sans séance comparable dans le pays,
 * sans chiffre dans la bonne unité sur celle qu'on a retenue, le repère
 * n'existe pas : un repère faux est pire que pas de repère, puisqu'on s'y
 * appuie.
 */
export interface Repere {
  /** Le niveau servi, dans l'unité du champ : % précompté ou % du nominal. */
  niveau: number;
  /** Le jour de cette séance. */
  le: string;
  /** Combien de séances comparables ont été trouvées, celle-ci comprise. */
  seances: number;
  /** Vrai quand il n'y en a qu'une : aucune dispersion mesurée, et on le dit. */
  uneSeule: boolean;
}

/** La durée d'une ligne neuve, en années, de son règlement à son échéance. */
function anneesDeLaLigne(o: Offer): number | undefined {
  if (!o.maturityOn || !o.settleOn) return undefined;
  const ans = (Date.parse(o.maturityOn) - Date.parse(o.settleOn)) / (365.25 * 86_400_000);
  return ans > 0 ? ans : undefined;
}

export function repereDuMarche(o: Offer, historique: AuctionResult[], now = new Date()): Repere | undefined {
  if (o.kind !== "BTA" && o.kind !== "OTA") return undefined;
  const annees = anneesDeLaLigne(o);
  if (annees == null || !o.country) return undefined;

  const n = niveauDuMarche({ country: o.country, instrument: o.kind, annees, on: localIso(now) }, historique);
  if (!n) return undefined;

  const seance = historique.find((r) => r.id === n.derniere.id);
  if (!seance) return undefined;

  /* LE MOYEN PONDÉRÉ D'ABORD, LE LIMITE ENSUITE. Le moyen est ce que la séance
     a coûté en moyenne ; le limite est son bord. Le premier répond mieux à
     « à quel niveau ça se sert », et le second ne sert que lorsque le
     communiqué n'imprime pas l'autre. */
  const niveau = surveyUnit(o) === "taux" ? (seance.rateAvg ?? seance.rateLimit) : (seance.priceAvg ?? seance.priceLimit);
  if (niveau == null) return undefined;

  return { niveau, le: seance.sessionOn, seances: n.seances.length, uneSeule: n.uneSeule };
}
