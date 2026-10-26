import "server-only";
import { repo } from "@/lib/data";
import type { LigneSondee } from "@/lib/domain/types";
import { fmt, fmtPct } from "@/lib/format";
import { tmpl } from "./compose";
import { notifyRaw } from "./dispatch";

/**
 * CE QUE LE CLIENT APPREND QUAND SON ATTENTE PART AU TRÉSOR.
 *
 * RELEVÉ À LA REVUE À 360° du 26 octobre 2026, et c'est une promesse non tenue
 * plutôt qu'un oubli : la page du sondage écrit, sur chaque attente portée,
 * « si une séance s'ouvre dessus, le desk vous rappellera avant la clôture ».
 * Le code, lui, changeait l'état et se taisait. Le client ne l'apprenait qu'en
 * rouvrant la page de lui-même — c'est-à-dire en faisant la chose qu'une
 * notification existe pour éviter.
 *
 * ET C'ÉTAIT LE SEUL SERVICE MUET : l'intention notifie à chaque étape de son
 * cycle, le prélèvement annonce son préavis, son encaissement ET son rejet, le
 * versement dit son refus motivé. Un sondage qui ne dit rien laisse croire
 * qu'il ne s'est rien passé.
 *
 * CE QUE LE MESSAGE NE DIT PAS, et c'est la moitié de son écriture : il ne
 * promet AUCUNE séance. La maison n'adjuge pas — elle porte un renseignement à
 * un Trésor qui décide seul. « Portée » est un fait accompli, « vous recevrez
 * des titres » serait un mensonge, et le client qui l'aurait lu tiendrait la
 * maison pour responsable du silence d'un État.
 *
 * IL NE PART QUE SUR LA LIGNE D'UN CLIENT. Une question de la maison n'a pas de
 * destinataire : son `userId` est nul, la base le tient, et l'appelant passe
 * ici les réponses une par une.
 */
export async function direLaConsolidation(l: LigneSondee): Promise<{ sent: boolean; error?: string }> {
  if (!l.userId) return { sent: false, error: "Une question de la maison n'a pas de destinataire." };
  /* LE TAUX S'ÉCRIT EN FRANÇAIS, virgule comprise : « 7.1 % » dans une phrase
     française se lit comme une coquille, et un client qui doute d'un chiffre
     doute de la phrase entière. */
  const niveau = l.rate != null ? ` à partir de ${fmtPct(l.rate, 2)}` : "";
  const text = `Purpose Capital : votre intention ${l.ref} — ${l.instrument} ${l.country} ${l.tenor}, ${fmt(l.montant)} FCFA${niveau} — est portée au Trésor concerné, avec celles des autres clients. Rien ne vous engage. Si une séance s'ouvre sur cette ligne, nous vous rappelons avant la clôture.`;
  try {
    const contact = await repo().getContact(l.userId);
    if (!contact) return { sent: false, error: "Aucun canal joignable pour annoncer la consolidation." };
    const template = { name: tmpl("WA_TEMPLATE_UPDATE", "guichet_maj"), params: [l.clientName ?? contact.name, text] };
    const rows = await notifyRaw("intent_update", contact, { subject: `Votre intention ${l.ref} est portée au Trésor`, text, template });
    return rows.some((x) => x.status === "sent") ? { sent: true } : { sent: false, error: rows.map((x) => `${x.channel} : ${x.status}`).join(" · ") || "aucun canal joignable" };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "échec de l'envoi" };
  }
}
