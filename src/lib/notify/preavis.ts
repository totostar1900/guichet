import "server-only";
import { repo } from "@/lib/data";
import type { Contact, Offer } from "@/lib/domain/types";
import type { StandingOrder } from "@/lib/domain/standing";
import { fmt, fmtDate } from "@/lib/format";
import { notifyRaw } from "./dispatch";

/**
 * À QUI PART UN MESSAGE D'INSTRUCTION.
 *
 * Le répertoire d'abord, qui porte ce que le client a confirmé par un code ;
 * l'instruction ensuite, qui porte le contact qu'il a donné EN LA SIGNANT. Un
 * client dont le répertoire est vide reste joignable : c'est le cas de
 * l'instruction ouverte au guichet, dont les coordonnées vivent sur elle.
 *
 * RÉSOLU UNE SEULE FOIS, ET C'EST TOUT L'INTÉRÊT : l'arrêt doit atteindre là
 * où le préavis est arrivé. Deux résolutions séparées feraient un client
 * prévenu chaque mois du versement à venir, et pas du jour où son plan
 * s'arrête — la seule des deux nouvelles qu'il ne peut pas deviner.
 */
async function destinataire(s: StandingOrder): Promise<Contact | undefined> {
  const c = await repo().getContact(s.userId);
  if (c) return c;
  if (!s.contactPhone && !s.contactEmail) return undefined;
  return { id: s.userId, name: s.clientName, segment: s.clientSegment, phone: s.contactPhone, email: s.contactEmail, whatsappOptIn: Boolean(s.contactPhone) };
}

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
    const contact = await destinataire(s);
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

/**
 * LE JOUR OÙ LE ROBOT ARRÊTE L'INSTRUCTION, et le client ne l'apprenait pas.
 *
 * RELEVÉ À LA REVUE DES ROBOTS du 26 octobre 2026. Le client qui a choisi
 * « arrêter si c'est impossible » a demandé l'arrêt ; il n'a pas demandé
 * l'arrêt muet. Son plan passait en « annulée », le motif partait au fil du
 * desk, et lui le lisait sur sa page d'épargne EN REVENANT — c'est-à-dire que
 * « plus rien ce mois-ci » ressemblait trait pour trait à « rien n'était prévu
 * ce mois-ci », exactement la panne confortable que cette maison traque.
 *
 * ET IL A REÇU UN PRÉAVIS CHAQUE MOIS, ce qui aggrave le silence : un client
 * habitué au message du 4 et qui ne reçoit plus rien le 4 a toutes les raisons
 * de croire que le versement est parti.
 *
 * LE MOTIF PART TEL QUEL. Les phrases de `standingBlock` sont écrites pour
 * être lues par la personne concernée — « Ce fonds n'est pas ouvert à la
 * souscription. » — et un arrêt sans raison n'est pas une réponse. C'est la
 * règle déjà tenue sur le refus de versement.
 *
 * SON ÉCHEC NE RETIENT RIEN, comme pour les avis d'espèces : l'instruction est
 * arrêtée, et un message qui ne part pas se voit au fil du desk, nommément. Ne
 * pas arrêter une instruction impossible à exécuter parce qu'un canal est
 * injoignable serait le pire des deux maux.
 */
export async function direLArretDeLInstruction(s: StandingOrder, o: Offer | undefined, p: { motif: string }): Promise<{ sent: boolean; error?: string }> {
  const quoi = s.source === "encaissements" ? "réinvestissement automatique" : "épargne programmée";
  const titre = o?.title ?? s.offerId;
  /* Un réinvestissement n'a pas de montant à lui : c'est ce qui arrive qui le
     fait. Annoncer « 0 FCFA » tairait de quoi on parle. */
  const combien = s.source === "encaissements" ? `sur ${titre}` : `de ${fmt(s.amount)} FCFA par mois sur ${titre}`;
  return envoyer(s, o, `Votre ${quoi} ${s.ref} est arrêtée`, `Purpose Capital : votre ${quoi} ${s.ref}, ${combien}, est arrêtée. ${p.motif} Rien n'a été prélevé et rien ne partira plus au titre de cette instruction. Vous pouvez en ouvrir une autre quand vous voulez depuis le Guichet, ou nous écrire pour que nous la reprenions avec vous.`);
}

/** L'envoi nu : le destinataire de l'instruction, un canal suffit, et la raison de l'échec. */
async function envoyer(s: StandingOrder, o: Offer | undefined, subject: string, text: string): Promise<{ sent: boolean; error?: string }> {
  try {
    const contact = await destinataire(s);
    if (!contact) return { sent: false, error: "Aucun canal : ni numéro WhatsApp avec opt-in, ni adresse e-mail." };
    const rows = await notifyRaw("intent_update", contact, { subject, text }, { offerId: o?.id });
    if (rows.some((x) => x.status === "sent")) return { sent: true };
    return { sent: false, error: rows.map((x) => `${x.channel} : ${x.status}${x.error ? ` (${x.error})` : ""}`).join(" · ") || "aucun canal joignable" };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "échec de l'envoi" };
  }
}
