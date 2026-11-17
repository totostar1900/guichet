import { INTENT_STATE_LABEL, ordreSignable } from "@/lib/domain/intent";
import type { Intent } from "@/lib/domain/types";

/* Les cinq arrêts par lesquels passe tout ordre que le desk mène. Une contre-proposition n'a pas reculé : l'ordre est là, il attend une réponse. */
const STOPS: Intent["state"][] = ["recue", "confirmee", "transmise", "servie", "reglee"];
const ARRET_NOM: Record<string, string> = { recue: "reçue", confirmee: "confirmée", transmise: "transmise", servie: "servie", reglee: "réglée" };
const stopIndex = (st: Intent["state"]) => (st === "non_servie" ? 3 : st === "annulee" ? -1 : st === "contre_proposee" ? 0 : STOPS.indexOf(st));

/* LA PISTE D'UN ORDRE DE FONDS SIGNÉ (17 novembre 2026, planche « Feuilles et ordres », 2A). La signature confirme l'ordre : « reçue » et « confirmée » ne se lisent plus. Quatre arrêts, qui commencent à « signé ». Un ordre non signé n'a pas de piste (rien ne court) ; un ordre que le desk mène garde ses cinq arrêts. */
export const deFonds = (i: Intent) => i.type === "souscription" || i.type === "rachat";
const ARRETS_FONDS = ["signé", "transmis", "exécuté"] as const;
export const pisteDe = (i: Intent): { arrets: string[]; etape: number } => {
  if (deFonds(i) && i.signedAt) {
    const dernier = i.type === "rachat" ? "produit viré" : "parts inscrites";
    const etape = i.state === "reglee" ? 3 : i.state === "servie" || i.state === "non_servie" ? 2 : i.state === "transmise" ? 1 : 0;
    return { arrets: [...ARRETS_FONDS, dernier], etape };
  }
  if (ordreSignable(i)) return { arrets: [], etape: -1 };
  return { arrets: STOPS.map((st) => ARRET_NOM[st]), etape: stopIndex(i.state) };
};
export const etatDe = (i: Intent): string => (ordreSignable(i) ? "À signer" : deFonds(i) && i.signedAt && i.state === "confirmee" ? "Signé" : INTENT_STATE_LABEL[i.state]);

