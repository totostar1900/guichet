import "server-only";
import { repo } from "@/lib/data";
import type { Offer } from "@/lib/domain/types";
import type { StandingOrder } from "@/lib/domain/standing";
import { fmt, fmtDate } from "@/lib/format";
import { notifyRaw } from "./dispatch";

/**
 * Le préavis envoyé au client, et le fait de savoir s'il est parti.
 *
 * L'ancien envoi vivait dans un try/catch vide : « un message qui ne part pas
 * ne doit pas empêcher le versement suivant ». Vrai pour le suivant, faux pour
 * celui-là. Ici, le résultat de l'envoi est RENDU, parce que c'est lui qui
 * autorise ou interdit l'exécution.
 *
 * `notifyRaw` inscrit une notification par canal et rend leur état. Un seul
 * « sent » suffit : le client a été joint quelque part. Rien de parti, et
 * l'occurrence reste en vie sans s'exécuter, avec la raison écrite dessus.
 */
export async function envoyerPreavis(
  s: StandingOrder,
  o: Offer | undefined,
  p: { dueOn: string; amount: number; cle?: string },
): Promise<{ sent: boolean; error?: string }> {
  const quoi = s.source === "encaissements" ? "réinvestissement" : "versement programmé";
  const text = `Purpose Capital : ${fmtDate(p.dueOn)}, ${quoi} de ${fmt(p.amount)} FCFA sur ${o?.title ?? s.offerId}, selon votre instruction ${s.ref}${p.cle ? `, réparti ${p.cle}` : ""}. Vous pouvez l'arrêter dans le Guichet jusqu'à la veille ; sans réponse, l'ordre part comme prévu.`;
  try {
    const c = await repo().getContact(s.userId);
    const contact = c ?? (s.contactPhone || s.contactEmail ? { id: s.userId, name: s.clientName, segment: s.clientSegment, phone: s.contactPhone, email: s.contactEmail, whatsappOptIn: Boolean(s.contactPhone) } : undefined);
    if (!contact) return { sent: false, error: "Aucun canal : ni numéro WhatsApp avec opt-in, ni adresse e-mail." };
    const rows = await notifyRaw("intent_update", contact, { subject: `${quoi} du ${fmtDate(p.dueOn)}`, text }, { offerId: o?.id });
    const parti = rows.some((x) => x.status === "sent");
    if (parti) return { sent: true };
    /* Aucun canal n'a abouti. On dit lequel a échoué et pourquoi : « préavis non
       envoyé » sans raison est exactement la panne muette qu'on vient de fermer. */
    const pourquoi = rows.map((x) => `${x.channel} : ${x.status}${x.error ? ` (${x.error})` : ""}`).join(" · ") || "aucun canal joignable";
    return { sent: false, error: pourquoi };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "échec de l'envoi" };
  }
}
