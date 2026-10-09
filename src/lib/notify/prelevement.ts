import "server-only";
import { repo } from "@/lib/data";
import type { MandatPrelevement } from "@/lib/domain/mandat";
import { MOTIFS, type MotifDeRejet } from "@/lib/domain/prelevement";
import { fmt, fmtDate } from "@/lib/format";
import { notifyRaw } from "./dispatch";

/**
 * CE QUE LE CLIENT REÇOIT AVANT, ET APRÈS.
 *
 * Avant, parce qu'un prélèvement non annoncé est un débit qu'on découvre sur
 * son relevé : le résultat de l'envoi est RENDU ici, et c'est lui qui autorise
 * ou interdit la remise à la banque.
 *
 * Après, parce qu'un rejet le concerne avant de nous concerner. Sa banque lui
 * a refusé une opération, et peut-être facturé un incident ; apprendre par
 * nous ce qui s'est passé et ce qui suit vaut mieux que de le deviner. Le
 * message dit donc la SUITE, pas la panne.
 */
async function contactDe(userId: string, m: MandatPrelevement) {
  const c = await repo().getContact(userId);
  if (c) return c;
  const f = await repo().getClientFileByUser(userId).catch(() => undefined);
  const phone = f?.identity.phone;
  const email = f?.identity.email;
  if (!phone && !email) return undefined;
  return { id: userId, name: m.accountHolder, segment: "particulier", phone, email, whatsappOptIn: Boolean(phone) };
}

export async function envoyerPreavisDePrelevement(m: MandatPrelevement, p: { dueOn: string; amount: number }): Promise<{ sent: boolean; error?: string }> {
  const quoi = m.objet === "provision" ? "votre provision" : "votre épargne programmée";
  const text = `Purpose Capital : le ${fmtDate(p.dueOn)}, nous présenterons un prélèvement de ${fmt(p.amount)} FCFA sur votre compte ${m.bankName}, pour alimenter ${quoi}, selon votre mandat ${m.ref}. Assurez-vous que le compte est approvisionné. Vous pouvez révoquer ce mandat à tout moment dans le Guichet, sans motif.`;
  try {
    const contact = await contactDe(m.userId, m);
    if (!contact) return { sent: false, error: "Aucun canal : ni numéro WhatsApp avec opt-in, ni adresse e-mail." };
    const rows = await notifyRaw("intent_update", contact, { subject: `Prélèvement du ${fmtDate(p.dueOn)}`, text });
    if (rows.some((x) => x.status === "sent")) return { sent: true };
    /* Dire lequel a échoué et pourquoi : « préavis non envoyé » sans raison est
       exactement la panne muette que tout ce lot évite. */
    return { sent: false, error: rows.map((x) => `${x.channel} : ${x.status}${x.error ? ` (${x.error})` : ""}`).join(" · ") || "aucun canal joignable" };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "échec de l'envoi" };
  }
}

export async function direLeRejet(m: MandatPrelevement, p: { dueOn: string; amount: number; motif: MotifDeRejet; represente?: string }): Promise<{ sent: boolean; error?: string }> {
  const suite = p.represente ? ` Nous le représenterons le ${fmtDate(p.represente)}, et nous vous préviendrons avant.` : " Votre mandat est en pause : nous ne présenterons plus rien tant que nous n'aurons pas repris les choses avec vous.";
  const text = `Purpose Capital : le prélèvement de ${fmt(p.amount)} FCFA du ${fmtDate(p.dueOn)} (mandat ${m.ref}) n'a pas abouti. ${MOTIFS[p.motif].auClient}${suite}`;
  try {
    const contact = await contactDe(m.userId, m);
    if (!contact) return { sent: false, error: "Aucun canal joignable pour annoncer le rejet." };
    const rows = await notifyRaw("intent_update", contact, { subject: `Prélèvement du ${fmtDate(p.dueOn)} non abouti`, text });
    return rows.some((x) => x.status === "sent") ? { sent: true } : { sent: false, error: rows.map((x) => `${x.channel} : ${x.status}`).join(" · ") || "aucun canal joignable" };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "échec de l'envoi" };
  }
}
