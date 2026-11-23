import { FIRM_TYPES, INTENT_STATE_LABEL, ordreSignable } from "@/lib/domain/intent";
import type { Intent } from "@/lib/domain/types";

/* Les cinq arrêts par lesquels passe tout ordre que le desk mène. Une contre-proposition n'a pas reculé : l'ordre est là, il attend une réponse. */
const STOPS: Intent["state"][] = ["recue", "confirmee", "transmise", "servie", "reglee"];
const ARRET_NOM: Record<string, string> = { recue: "reçue", confirmee: "confirmée", transmise: "transmise", servie: "servie", reglee: "réglée" };
const stopIndex = (st: Intent["state"]) => (st === "non_servie" ? 3 : st === "annulee" ? -1 : st === "contre_proposee" ? 0 : STOPS.indexOf(st));

/* LA PISTE D'UN ORDRE SIGNÉ (17 novembre 2026 pour un fonds, étendue le 23 novembre 2026 à toute transaction, planche « Signer tous les ordres »). La signature confirme l'ordre : « reçue » et « confirmée » ne se lisent
   plus. Quatre arrêts, qui commencent à « signé » : un fonds se lit signé, transmis, exécuté, parts inscrites (ou produit viré) ; un titre signé, transmis, servi, réglé (produit viré pour une vente ou une cession).
   Un ordre non signé n'a pas de piste (rien ne court) ; un ordre que le desk mène sans signature garde ses cinq arrêts. */
export const deFonds = (i: Intent) => i.type === "souscription" || i.type === "rachat";
export const pisteDe = (i: Intent): { arrets: string[]; etape: number } => {
  if (i.signedAt && FIRM_TYPES.includes(i.type)) {
    const reduit = i.type === "rachat" || i.type === "vente" || i.type === "cession";
    const milieu = deFonds(i) ? ["transmis", "exécuté"] : ["transmis", "servi"];
    const dernier = i.type === "souscription" ? "parts inscrites" : reduit ? "produit viré" : "réglé";
    const etape = i.state === "reglee" ? 3 : i.state === "servie" || i.state === "non_servie" ? 2 : i.state === "transmise" ? 1 : 0;
    return { arrets: ["signé", ...milieu, dernier], etape };
  }
  if (ordreSignable(i)) return { arrets: [], etape: -1 };
  return { arrets: STOPS.map((st) => ARRET_NOM[st]), etape: stopIndex(i.state) };
};
export const etatDe = (i: Intent): string => (ordreSignable(i) ? "À signer" : i.signedAt && FIRM_TYPES.includes(i.type) && i.state === "confirmee" ? "Signé" : INTENT_STATE_LABEL[i.state]);
