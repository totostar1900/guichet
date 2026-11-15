import "server-only";
import { audit } from "@/lib/audit";
import { repo } from "@/lib/data";
import { suiteDeLaCopie } from "@/lib/domain/mandat";
import { direLaCopieDuMandat } from "@/lib/notify/prelevement";

/**
 * LA COPIE SIGNÉE À LA MAIN QUI TARDE (15 novembre 2026, maquette « Signature manuelle » : 1A, 2 OK).
 *
 * Un rappel après 7 jours, une seule fois. Après 30 jours sans copie, le mandat est retiré avec l'épargne qu'il devait alimenter, et la trace reste. Rien n'a été prélevé :
 * le prélèvement attend la vérification de la copie. Appelé par le robot de l'épargne, à chaque tour.
 */
const ROBOT = "robot épargne";

export async function suivreLesCopies(today: string, robot: string = ROBOT): Promise<{ relances: number; retires: number }> {
  const r = repo();
  let relances = 0;
  let retires = 0;
  for (const m of await r.listMandats()) {
    const suite = suiteDeLaCopie(m, today);
    if (!suite) continue;
    const maintenant = new Date().toISOString();
    if (suite === "relancer") {
      // Posé avant l'envoi : un tour qui rejoue ne rappelle pas deux fois.
      await r.updateMandat(m.id, { relanceLe: maintenant });
      const envoi = await direLaCopieDuMandat(m, "relance");
      relances += 1;
      await r.logEvent({ kind: envoi.sent ? "system" : "avis_manque", html: `Mandat ${m.ref} (${m.accountHolder}) : <b>copie signée attendue</b>, rappel ${envoi.sent ? "envoyé" : `non envoyé (${envoi.error ?? "canal injoignable"})`} · ${robot}` });
      continue;
    }
    await r.updateMandat(m.id, { state: "revoque", revokedAt: maintenant, revokedReason: "Copie signée non reçue sous 30 jours" });
    if (m.standingId) await r.updateStandingOrder(m.standingId, { state: "annulee", stopReason: "mandat retiré faute de copie signée" });
    await audit("mandat.retire", "mandat", m.id, { before: { etat: m.state }, after: { etat: "revoque", motif: "copie non reçue sous 30 jours" }, reason: `Mandat ${m.ref} retiré : copie signée non reçue sous 30 jours`, actor: ROBOT });
    const envoi = await direLaCopieDuMandat(m, "retiree");
    retires += 1;
    await r.logEvent({ kind: envoi.sent ? "system" : "avis_manque", html: `Mandat ${m.ref} (${m.accountHolder}) : <b>retiré</b>, copie signée non reçue sous 30 jours${m.standingId ? " · l'épargne qu'il alimentait est arrêtée" : ""} · ${robot}` });
  }
  return { relances, retires };
}
