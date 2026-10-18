import type { AuctionResult } from "./auction-results";
import type { Offer } from "@/lib/domain/types";
import { headlineYield } from "@/lib/domain/status";
import { niveauDuMarche, type NiveauMarche } from "./niveau-marche";

/**
 * RAPPROCHER CE QUE NOUS MONTRONS DE CE QUE LA PLACE A PAYÉ.
 *
 * Le carnet d'offres ouvertes porte depuis toujours deux colonnes qui ne se
 * sont jamais parlé : « Prix Purpose », que le desk fixe, et « Rendement
 * publié », qui en découle et que le client lit. Il leur manquait la seule
 * chose qui permette de les juger : ce que la place a payé sur la même
 * échéance, chez le même Trésor.
 *
 * L'ÉCART EST UN CONSTAT, JAMAIS UNE CONCLUSION. Il dit de combien nous nous
 * éloignons du marché, pas à qui la différence profite : sur le primaire,
 * c'est l'adjudication qui fixe le prix, et ce que nous affichons avant la
 * séance est une attente. Un écart large peut donc signaler une attente
 * désuète aussi bien qu'une décision.
 *
 * SON SIGNE SE LIT DANS UN SEUL SENS, et il faut le dire une fois pour toutes :
 * positif quand le MARCHÉ REND PLUS que ce que nous montrons.
 */

export interface LigneTarifee {
  offerId: string;
  /** Le rendement que la fiche montre au client, par le calcul qu'elle emploie. */
  publie?: number;
  /** Ce que la place a payé, quand une séance comparable existe. */
  niveau?: NiveauMarche;
  /** niveau − publié, en points de base. Absent dès que l'un des deux manque. */
  ecartPb?: number;
  /** La vie restante employée pour choisir le panier, en années. */
  annees?: number;
}

/** Le seuil au-delà duquel un écart mérite qu'on s'arrête, en points de base. */
export const ECART_A_REGARDER = 50;
/** Au-delà de celui-ci, l'écart ne s'explique plus par un arrondi ni par le temps. */
export const ECART_TRES_LOIN = 200;

/**
 * Les lignes primaires d'un carnet, rapprochées du marché.
 *
 * L'historique se passe entier : le tri par panier d'échéance se fait dans
 * `niveauDuMarche`, et une requête par ligne rendrait la page du desk
 * inutilisable pour gagner un filtre que le code fait en mémoire.
 */
export function tariferLesLignes(offres: Offer[], historique: AuctionResult[], on: string): Map<string, LigneTarifee> {
  const out = new Map<string, LigneTarifee>();
  for (const o of offres) {
    /* Seuls les titres de taux ont un comparable à l'adjudication. Une action
       ou un OPCVM n'en a pas, et leur en chercher un produirait un vide qu'on
       lirait comme un manque. */
    if (o.kind !== "BTA" && o.kind !== "OTA" && o.kind !== "APE") continue;
    if (!o.maturityOn) continue;

    const annees = (Date.parse(o.maturityOn) - Date.parse(on)) / 86_400_000 / 365;
    if (!(annees > 0)) continue;

    const publie = headlineYield(o) ?? undefined;
    const niveau = niveauDuMarche({ country: o.country, instrument: o.kind === "BTA" ? "BTA" : "OTA", annees, on }, historique);
    const ecartPb = publie != null && niveau ? Math.round((niveau.point - publie) * 100) : undefined;
    out.set(o.id, { offerId: o.id, publie, niveau, ecartPb, annees });
  }
  return out;
}

/** Ce que l'écart vaut, en un mot, pour la pastille du carnet. */
export type EtatDeLEcart = "proche" | "a-regarder" | "tres-loin" | "sans-comparable";

export function etatDeLEcart(l: LigneTarifee | undefined): EtatDeLEcart {
  if (!l?.niveau || l.ecartPb == null) return "sans-comparable";
  const a = Math.abs(l.ecartPb);
  if (a > ECART_TRES_LOIN) return "tres-loin";
  if (a > ECART_A_REGARDER) return "a-regarder";
  return "proche";
}
