import "server-only";
import { repo } from "@/lib/data";
import type { MandatPrelevement } from "@/lib/domain/mandat";
import { MOTIFS, type MotifDeRejet } from "@/lib/domain/prelevement";
import { fmt, fmtDate } from "@/lib/format";
import { tmpl } from "./compose";
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

/**
 * LE MODÈLE DU PRÉAVIS, ET POURQUOI SES CINQ PARAMÈTRES SONT UN CONTRAT.
 *
 * Un préavis part cinq jours avant l'échéance, donc hors de la fenêtre de
 * vingt-quatre heures où Meta tolère un texte libre : il lui faut un modèle
 * approuvé. Le texte soumis vit dans `docs/modeles-whatsapp.md`,
 * et l'ordre ci-dessous est celui de ses variables.
 *
 * Un modèle approuvé avec cinq variables et un envoi qui en passe quatre est
 * refusé à CHAQUE message, et le refus ne se lit que dans la réponse de
 * l'API. Un cliquet compare donc les deux.
 */
const MODELE_PREAVIS = () => tmpl("WA_TEMPLATE_PRELEVEMENT", "guichet_prelevement");

export async function envoyerPreavisDePrelevement(m: MandatPrelevement, p: { dueOn: string; amount: number }): Promise<{ sent: boolean; error?: string }> {
  const quoi = m.objet === "provision" ? "votre provision" : "votre épargne programmée";
  const text = `Purpose Capital : le ${fmtDate(p.dueOn)}, nous présenterons un prélèvement de ${fmt(p.amount)} FCFA sur votre compte ${m.bankName}, pour alimenter ${quoi}, selon votre mandat ${m.ref}. Assurez-vous que le compte est approvisionné. Vous pouvez révoquer ce mandat à tout moment dans le Guichet, sans motif.`;
  const template = { name: MODELE_PREAVIS(), params: [fmtDate(p.dueOn), fmt(p.amount), m.bankName, quoi, m.ref] };
  try {
    const contact = await contactDe(m.userId, m);
    if (!contact) return { sent: false, error: "Aucun canal : ni numéro WhatsApp avec opt-in, ni adresse e-mail." };
    const rows = await notifyRaw("intent_update", contact, { subject: `Prélèvement du ${fmtDate(p.dueOn)}`, text, template });
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
    /* LE REJET N'A PAS SON MODÈLE, et c'est délibéré : il passe par le modèle
       générique de mise à jour, un nom puis une ligne. Lui en donner un
       propre obligerait à faire approuver par Meta les six causes de rejet,
       dont « opposition du client » et « compte clos » : des phrases que
       personne n'a envie de voir figées dans un catalogue chez un tiers. La
       ligne reste de notre côté, et elle se corrige sans soumission. */
    const template = { name: tmpl("WA_TEMPLATE_UPDATE", "guichet_maj"), params: [m.accountHolder, text] };
    const rows = await notifyRaw("intent_update", contact, { subject: `Prélèvement du ${fmtDate(p.dueOn)} non abouti`, text, template });
    return rows.some((x) => x.status === "sent") ? { sent: true } : { sent: false, error: rows.map((x) => `${x.channel} : ${x.status}`).join(" · ") || "aucun canal joignable" };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "échec de l'envoi" };
  }
}
